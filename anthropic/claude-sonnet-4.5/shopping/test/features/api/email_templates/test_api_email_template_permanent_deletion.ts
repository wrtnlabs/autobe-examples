import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test permanent deletion of an email template.
 *
 * This test validates the hard delete functionality where an email template
 * record is completely removed from the database. The test ensures that:
 *
 * 1. Admin can authenticate successfully
 * 2. Sales channel can be created as a prerequisite
 * 3. Email template can be created
 * 4. Template can be permanently deleted
 * 5. Deletion operation completes successfully (void return)
 *
 * The deletion is irreversible as the schema does not include soft deletion
 * fields for email templates. This operation is exclusively available to
 * administrators who manage platform-wide email communication templates.
 */
export async function test_api_email_template_permanent_deletion(
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
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a sales channel (prerequisite for email template)
  const channelData = {
    channel_code: RandomGenerator.alphaNumeric(8),
    channel_name: RandomGenerator.name(2),
  } satisfies IShoppingMallChannel.ICreate;

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(channel);

  // Step 3: Create an email template to be deleted
  const templateData = {
    template_code: `TEST_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    template_name: RandomGenerator.name(3),
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const template: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateData,
    });
  typia.assert(template);

  // Step 4: Permanently delete the email template
  await api.functional.shoppingMall.admin.emailTemplates.erase(connection, {
    templateId: template.id,
  });

  // Deletion is successful if no error is thrown (void return type)
  // The template is now permanently removed from the system
}
