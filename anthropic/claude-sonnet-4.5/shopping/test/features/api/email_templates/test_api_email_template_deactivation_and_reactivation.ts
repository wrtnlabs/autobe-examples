import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test email template update functionality.
 *
 * Validates that an admin can update an email template's properties. Since the
 * available API only supports updating template_name, this test verifies that
 * template name updates are correctly persisted.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create an initial email template
 * 3. Update the template name to a new value
 * 4. Verify the template name was updated
 * 5. Update the template name again to a different value
 * 6. Verify the second update was also applied correctly
 */
export async function test_api_email_template_deactivation_and_reactivation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create an initial email template
  const templateData = {
    template_code: RandomGenerator.alphaNumeric(10),
    template_name: RandomGenerator.name(3),
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const createdTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateData,
    });
  typia.assert(createdTemplate);

  // Step 3: Update the template name to a new value
  const firstUpdatedName = RandomGenerator.name(4);
  const firstUpdate = {
    template_name: firstUpdatedName,
  } satisfies IShoppingMallEmailTemplate.IUpdate;

  const firstUpdatedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.update(connection, {
      templateId: createdTemplate.id,
      body: firstUpdate,
    });
  typia.assert(firstUpdatedTemplate);

  // Step 4: Verify the first update was applied
  TestValidator.equals(
    "updated template ID matches original",
    firstUpdatedTemplate.id,
    createdTemplate.id,
  );
  TestValidator.equals(
    "template code remains unchanged",
    firstUpdatedTemplate.template_code,
    createdTemplate.template_code,
  );
  TestValidator.equals(
    "template name was updated to new value",
    firstUpdatedTemplate.template_name,
    firstUpdatedName,
  );

  // Step 5: Update the template name again to a different value
  const secondUpdatedName = RandomGenerator.name(5);
  const secondUpdate = {
    template_name: secondUpdatedName,
  } satisfies IShoppingMallEmailTemplate.IUpdate;

  const secondUpdatedTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.update(connection, {
      templateId: firstUpdatedTemplate.id,
      body: secondUpdate,
    });
  typia.assert(secondUpdatedTemplate);

  // Step 6: Verify the second update was applied correctly
  TestValidator.equals(
    "template ID remains consistent",
    secondUpdatedTemplate.id,
    createdTemplate.id,
  );
  TestValidator.equals(
    "template code still unchanged",
    secondUpdatedTemplate.template_code,
    createdTemplate.template_code,
  );
  TestValidator.equals(
    "template name updated to second new value",
    secondUpdatedTemplate.template_name,
    secondUpdatedName,
  );
  TestValidator.notEquals(
    "template name different from first update",
    secondUpdatedTemplate.template_name,
    firstUpdatedName,
  );
}
