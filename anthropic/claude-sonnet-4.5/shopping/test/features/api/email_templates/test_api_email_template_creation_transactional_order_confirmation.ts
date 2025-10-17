import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test the complete workflow for creating a transactional email template for
 * order confirmations.
 *
 * This test validates the end-to-end process of setting up email communication
 * infrastructure in the shopping mall platform. It demonstrates the proper
 * sequence of operations required before email templates can be created and
 * used for customer communications.
 *
 * Workflow Steps:
 *
 * 1. Admin Authentication - Create and authenticate an administrator with content
 *    management permissions
 * 2. Sales Channel Creation - Establish a sales channel for channel-specific email
 *    customization
 * 3. Email Template Creation - Create a transactional order confirmation email
 *    template
 * 4. Validation - Verify all created resources have correct structure and
 *    properties
 *
 * Business Context: Email templates are critical platform assets that define
 * how the system communicates with customers during key transactional events
 * like order confirmations. Only authenticated administrators with appropriate
 * permissions can create these templates to ensure brand consistency and
 * compliance with communication policies.
 */
export async function test_api_email_template_creation_transactional_order_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user with content management permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = `TestPass${RandomGenerator.alphaNumeric(8)}!`;
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });

  // Validate admin authentication response
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals("admin role level", admin.role_level, "super_admin");
  typia.assert<string & tags.Format<"uuid">>(admin.id);
  typia.assert<IAuthorizationToken>(admin.token);

  // Step 2: Create a sales channel for channel-specific email template association
  const channelCode = `CHANNEL_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const channelName = `${RandomGenerator.name(2)} Sales Channel`;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        channel_code: channelCode,
        channel_name: channelName,
      } satisfies IShoppingMallChannel.ICreate,
    });

  // Validate channel creation response
  typia.assert(channel);
  TestValidator.equals(
    "channel code matches",
    channel.channel_code,
    channelCode,
  );
  TestValidator.equals(
    "channel name matches",
    channel.channel_name,
    channelName,
  );
  typia.assert<string & tags.Format<"uuid">>(channel.id);

  // Step 3: Create transactional email template for order confirmations
  const templateCode = "ORDER_CONFIRMATION";
  const templateName = "Order Confirmation Email Template";

  const emailTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: templateCode,
        template_name: templateName,
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });

  // Validate email template creation response
  typia.assert(emailTemplate);
  TestValidator.equals(
    "template code matches",
    emailTemplate.template_code,
    templateCode,
  );
  TestValidator.equals(
    "template name matches",
    emailTemplate.template_name,
    templateName,
  );
  typia.assert<string & tags.Format<"uuid">>(emailTemplate.id);
}
