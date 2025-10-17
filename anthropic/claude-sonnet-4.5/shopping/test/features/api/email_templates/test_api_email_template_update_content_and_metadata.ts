import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test complete email template update workflow.
 *
 * This test validates an admin's ability to modify an existing email template's
 * content and metadata. The scenario ensures that template updates are applied
 * correctly and that the updated template is immediately available for use.
 *
 * Workflow:
 *
 * 1. Create an admin account for template management
 * 2. Create a sales channel to associate with the template
 * 3. Create an initial email template
 * 4. Update the template with new metadata
 * 5. Verify all updated fields are persisted correctly
 */
export async function test_api_email_template_update_content_and_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create sales channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        channel_code: RandomGenerator.alphaNumeric(8),
        channel_name: RandomGenerator.name(2),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create initial email template
  const initialTemplateCode = RandomGenerator.alphaNumeric(10);
  const initialTemplateName = RandomGenerator.name(3);
  const template =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: initialTemplateCode,
        template_name: initialTemplateName,
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });
  typia.assert(template);

  // Step 4: Update template with new metadata
  const updatedTemplateName = RandomGenerator.name(3);
  const updatedTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.update(connection, {
      templateId: template.id,
      body: {
        template_name: updatedTemplateName,
      } satisfies IShoppingMallEmailTemplate.IUpdate,
    });
  typia.assert(updatedTemplate);

  // Step 5: Verify updated fields
  TestValidator.equals(
    "template ID unchanged",
    updatedTemplate.id,
    template.id,
  );
  TestValidator.equals(
    "template code unchanged",
    updatedTemplate.template_code,
    initialTemplateCode,
  );
  TestValidator.equals(
    "template name updated",
    updatedTemplate.template_name,
    updatedTemplateName,
  );
  TestValidator.notEquals(
    "template name changed",
    updatedTemplate.template_name,
    initialTemplateName,
  );
}
