/**
 * @license
 * Copyright 2019 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

 foam.CLASS({
  package: 'foam.nanos.notification.email',
  name: 'ApplyBaseArgumentsEmailPropertyService',

  // documentation: 'Fills unset properties on an email with values from the emailTemplate.',

  // implements: [
  //   'foam.nanos.notification.email.EmailPropertyService'
  // ],

  // javaImports: [
  //   'foam.nanos.logger.Logger',
  //   'foam.nanos.logger.StdoutLogger',
  //   'foam.util.SafetyUtil'
  // ],

  methods: [
    {
      name: 'apply',
      type: 'foam.nanos.notification.email.EmailMessage',
      documentation: 'application of template args to emailTemplate and then onto the emailMessage',
      javaCode: `
      Theme theme = (Theme) x.get("theme");
      User user = ((Subject) x.get('subject)).getUser()
      if ( theme == null
        || ( user != null && ! user.getSpid().equals(x.get("spid")) )
      ) {
        theme = ((Themes) x.get("themes")).findTheme(userX);
      }
      
      SupportConfig supportConfig = theme.getSupportConfig();
      EmailConfig emailConfig = supportConfig.getEmailConfig();

      // Set ReplyTo, From, DisplayName from support email config
      if ( emailConfig != null ) {
        // REPLY TO:
        if ( ! SafetyUtil.isEmpty(emailConfig.getReplyTo()) ) {
          emailMessage.setReplyTo(emailConfig.getReplyTo());
        }

        // DISPLAY NAME:
        if ( ! SafetyUtil.isEmpty(emailConfig.getDisplayName()) ) {
          emailMessage.setDisplayName(emailConfig.getDisplayName());
        }

        // FROM:
        if ( ! SafetyUtil.isEmpty(emailConfig.getFrom()) ) {
          emailMessage.setFrom(emailConfig.getFrom());
        }
      }

      // Add template name to templateArgs, to avoid extra parameter passing
      if ( ! SafetyUtil.isEmpty(templateName) ) {
        // Logger info templateName
        return emailMessage;
      }

      if ( templateArgs != null ) {
        templateArgs.put("template", templateName);
      } else {
        templateArgs = new HashMap<>();
        templateArgs.put("template", templateName);
      }

      String url = appConfig.getUrl().replaceAll("/$", "");
      templateArgs.put("logo", (url + "/" + theme.getLogo()));
      templateArgs.put("largeLogo", (url + "/" + theme.getLargeLogo()));
      templateArgs.put("appLink", url);
      templateArgs.put("appName", (theme.getAppName()));

      templateArgs.put("locale", user.getLanguage().getCode().toString());

      foam.nanos.auth.Address address = supportConfig.getSupportAddress();
      templateArgs.put("supportAddress", address == null ? "" : address.toSummary());
      templateArgs.put("supportPhone", (supportConfig.getSupportPhone()));
      templateArgs.put("supportEmail", (supportConfig.getSupportEmail()));

      // personal support user
      User psUser = supportConfig.findPersonalSupportUser(x);
      templateArgs.put("personalSupportPhone", psUser == null ? "" : psUser.getPhoneNumber());
      templateArgs.put("personalSupportEmail", psUser == null ? "" : psUser.getEmail());
      templateArgs.put("personalSupportFirstName", psUser == null ? "" : psUser.getFirstName());
      templateArgs.put("personalSupportFullName", psUser == null ? "" : psUser.getLegalName());

      emailMessage.setTemplateArguments(templateArgs);
      return emailMessage;
      `
    }
  ]
});
