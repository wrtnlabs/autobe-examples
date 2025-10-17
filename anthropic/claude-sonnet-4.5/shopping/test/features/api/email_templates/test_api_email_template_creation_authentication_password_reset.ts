import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";

/**
 * Test creating an authentication category email template for password reset
 * communications.
 *
 * This test validates the complete workflow for an admin to create a password
 * reset email template:
 *
 * 1. Admin Authentication - An admin registers/joins to obtain authentication
 *    credentials
 * 2. Email Template Creation - The authenticated admin creates a PASSWORD_RESET
 *    template
 * 3. Validation - Verify the template is created correctly with proper identifiers
 *
 * The password reset template is essential for the platform's security
 * workflow, enabling users (both customers and sellers) to reset their
 * passwords through secure email communications.
 */
export async function test_api_email_template_creation_authentication_password_reset(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminCreateData = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Verify admin authentication response
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  typia.assert(admin.token);

  // Step 2: Create password reset email template
  const templateCode = "PASSWORD_RESET";
  const templateName = "Password Reset Authentication Email";

  const templateCreateData = {
    template_code: templateCode,
    template_name: templateName,
  } satisfies IShoppingMallEmailTemplate.ICreate;

  const createdTemplate: IShoppingMallEmailTemplate =
    await api.functional.shoppingMall.admin.emailTemplates.create(connection, {
      body: templateCreateData,
    });
  typia.assert(createdTemplate);

  // Step 3: Validate the created template
  TestValidator.equals(
    "template code matches",
    createdTemplate.template_code,
    templateCode,
  );
  TestValidator.equals(
    "template name matches",
    createdTemplate.template_name,
    templateName,
  );
}
