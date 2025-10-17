import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Validates email template deletion with proper error handling for non-existent
 * templates.
 *
 * This test ensures that the email template deletion endpoint correctly
 * validates template existence and returns appropriate errors when attempting
 * to delete templates that have already been deleted or never existed.
 *
 * Test flow:
 *
 * 1. Authenticate as admin to gain deletion permissions
 * 2. Create a sales channel for template association
 * 3. Create an email template to test deletion
 * 4. Successfully delete the template (first deletion)
 * 5. Attempt to delete the same template again (should fail)
 * 6. Verify that the second deletion returns an error indicating template not
 *    found
 */
export async function test_api_email_template_deletion_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a sales channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        channel_code: RandomGenerator.alphaNumeric(8),
        channel_name: RandomGenerator.name(2),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create an email template
  const template: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: RandomGenerator.alphaNumeric(10),
        template_name: RandomGenerator.name(3),
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });
  typia.assert(template);

  // Step 4: Delete the template successfully (first deletion)
  await api.functional.shoppingMall.admin.emailTemplates.erase(connection, {
    templateId: template.id,
  });

  // Step 5: Attempt to delete the same template again (should fail)
  await TestValidator.error(
    "deleting already deleted template should fail",
    async () => {
      await api.functional.shoppingMall.admin.emailTemplates.erase(connection, {
        templateId: template.id,
      });
    },
  );
}
