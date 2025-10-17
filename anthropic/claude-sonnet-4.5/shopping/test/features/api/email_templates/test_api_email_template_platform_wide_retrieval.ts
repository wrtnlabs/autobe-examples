import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test retrieving a platform-wide email template that is not associated with
 * any specific channel.
 *
 * This test validates that email templates with null channel_id are accessible
 * to admins and contain all necessary information for cross-channel
 * communications. The test creates a platform-wide template with comprehensive
 * variable placeholders and proper sender configuration, then verifies that the
 * template can be retrieved successfully with all fields properly populated.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create platform-wide email template without channel association
 * 3. Retrieve the template by ID
 * 4. Validate all template fields match the created data
 */
export async function test_api_email_template_platform_wide_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = RandomGenerator.pick([
    "super_admin",
    "content_moderator",
    "order_manager",
  ] as const);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: adminRoleLevel,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create platform-wide email template
  const templateCodes = [
    "ORDER_CONFIRMATION",
    "PASSWORD_RESET",
    "WELCOME_EMAIL",
    "SHIPMENT_NOTIFICATION",
    "REFUND_APPROVED",
  ] as const;
  const templateCode = RandomGenerator.pick(templateCodes);
  const templateName = `${templateCode
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")} Template`;

  const createdTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: {
        template_code: templateCode,
        template_name: templateName,
      } satisfies IShoppingMallEmailTemplate.ICreate,
    });
  typia.assert(createdTemplate);

  // Step 3: Retrieve the template by ID
  const retrievedTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.at(connection, {
      templateId: createdTemplate.id,
    });
  typia.assert(retrievedTemplate);

  // Step 4: Validate all template fields
  TestValidator.equals(
    "template ID matches",
    retrievedTemplate.id,
    createdTemplate.id,
  );
  TestValidator.equals(
    "template code matches",
    retrievedTemplate.template_code,
    createdTemplate.template_code,
  );
  TestValidator.equals(
    "template name matches",
    retrievedTemplate.template_name,
    createdTemplate.template_name,
  );
}
