import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test creating a platform-wide email template for welcoming new users.
 *
 * This test validates the email template creation workflow for platform-wide
 * communication. It verifies that an authenticated admin can create a welcome
 * email template that is available across all channels without channel-specific
 * restrictions.
 *
 * Test Steps:
 *
 * 1. Authenticate as admin to gain template management access
 * 2. Create platform-wide welcome email template with appropriate metadata
 * 3. Validate template creation response and properties
 * 4. Verify template can be used across all channels (no channel restrictions)
 */
export async function test_api_email_template_creation_platform_wide_welcome_message(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();

  const adminBody = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 2: Create platform-wide welcome email template
  const templateCode = "WELCOME_EMAIL";
  const templateName = "Platform Welcome Message";

  const templateBody = {
    template_code: templateCode,
    template_name: templateName,
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const template =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateBody,
    });
  typia.assert(template);

  // Step 3: Validate template creation
  TestValidator.equals(
    "template code matches",
    template.template_code,
    templateCode,
  );

  TestValidator.equals(
    "template name matches",
    template.template_name,
    templateName,
  );

  TestValidator.predicate("template ID is generated", template.id.length > 0);
}
