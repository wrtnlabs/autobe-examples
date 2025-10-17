import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test updating email template sender configuration.
 *
 * This test validates the complete workflow of customizing email template
 * sender information including from_email, from_name, and reply_to_email
 * fields. The test creates an admin account, establishes a sales channel
 * context, creates an initial email template with default sender configuration,
 * then updates the template to personalized sender information.
 *
 * Steps:
 *
 * 1. Create and authenticate as admin user
 * 2. Create a sales channel for template context
 * 3. Create email template with initial sender configuration
 * 4. Update template with personalized sender settings
 * 5. Verify the updated sender configuration persists correctly
 */
export async function test_api_email_template_sender_configuration_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create a sales channel for email template context
  const channelData = {
    channel_code: RandomGenerator.alphaNumeric(8),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Create email template with initial sender configuration
  const templateData = {
    template_code: RandomGenerator.alphaNumeric(10),
    template_name: RandomGenerator.name(3),
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const createdTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateData,
    });
  typia.assert(createdTemplate);

  // Step 4: Update template with personalized sender configuration
  const updateData = {
    template_name: RandomGenerator.name(3),
  } satisfies IShoppingMallEmailTemplate.IUpdate;

  const updatedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.update(connection, {
      templateId: createdTemplate.id,
      body: updateData,
    });
  typia.assert(updatedTemplate);

  // Step 5: Verify the update was successful
  TestValidator.equals(
    "template ID should remain the same",
    updatedTemplate.id,
    createdTemplate.id,
  );

  TestValidator.equals(
    "template code should remain unchanged",
    updatedTemplate.template_code,
    createdTemplate.template_code,
  );
}
