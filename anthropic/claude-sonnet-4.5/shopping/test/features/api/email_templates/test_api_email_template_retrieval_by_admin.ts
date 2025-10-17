import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test email template retrieval by admin.
 *
 * This test validates the complete workflow of retrieving email template
 * details by administrators. It ensures that admins can successfully access
 * comprehensive email template information after proper authentication and
 * template creation.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create a sales channel for template association
 * 3. Create an email template with complete configuration
 * 4. Retrieve the template by ID and validate all properties
 */
export async function test_api_email_template_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create a sales channel
  const channelData = {
    channel_code: RandomGenerator.alphaNumeric(8),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Create an email template
  const templateData = {
    template_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    template_name: RandomGenerator.name(3),
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const createdTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateData,
    });
  typia.assert(createdTemplate);

  // Step 4: Retrieve the email template by ID
  const retrievedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.at(connection, {
      templateId: createdTemplate.id,
    });
  typia.assert(retrievedTemplate);

  // Validate retrieved template matches created template
  TestValidator.equals(
    "retrieved template ID matches created template",
    retrievedTemplate.id,
    createdTemplate.id,
  );

  TestValidator.equals(
    "retrieved template code matches",
    retrievedTemplate.template_code,
    createdTemplate.template_code,
  );

  TestValidator.equals(
    "retrieved template name matches",
    retrievedTemplate.template_name,
    createdTemplate.template_name,
  );
}
