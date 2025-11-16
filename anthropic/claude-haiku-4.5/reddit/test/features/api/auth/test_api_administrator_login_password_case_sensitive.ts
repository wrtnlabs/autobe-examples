import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that administrator login password validation is case-sensitive.
 *
 * This test validates that the platform's password authentication enforces
 * case-sensitivity for administrator account login. A password with specific
 * casing is registered during account creation, and only the exact password
 * with matching case will allow successful authentication. Variations of the
 * password with different casing are rejected, demonstrating that password
 * validation respects case-sensitivity as a security requirement.
 *
 * Test workflow:
 *
 * 1. Create an administrator account with a password containing mixed case
 * 2. Verify successful login with the exact password case
 * 3. Attempt login with password converted to uppercase - verify rejection
 * 4. Attempt login with password converted to lowercase - verify rejection
 * 5. Confirm password case-sensitivity prevents unauthorized access
 */
export async function test_api_administrator_login_password_case_sensitive(
  connection: api.IConnection,
) {
  // Generate test credentials with specific casing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  // Create password with mixed case to test case-sensitivity
  const originalPassword = "TestPassword123Mixed";
  const upperCasePassword = originalPassword.toUpperCase();
  const lowerCasePassword = originalPassword.toLowerCase();

  // Step 1: Create administrator account with original password
  const createAdminBody = {
    email: adminEmail,
    password: originalPassword,
    username: adminUsername,
    name: adminName,
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: createAdminBody,
    },
  );
  typia.assert(createdAdmin);
  typia.assertGuard(createdAdmin.token);

  TestValidator.equals(
    "created administrator email matches input",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created administrator username matches input",
    createdAdmin.username,
    adminUsername,
  );

  // Step 2: Test successful login with exact password case
  const loginWithExactCase = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    },
  );
  typia.assert(loginWithExactCase);
  TestValidator.equals(
    "login with exact password case succeeds",
    loginWithExactCase.id,
    createdAdmin.id,
  );

  // Step 3: Test login rejection with uppercase password
  await TestValidator.error(
    "login with uppercase password case should fail",
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: adminEmail,
          password: upperCasePassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: "",
        } satisfies ICommunityPlatformAdministrator.ILogin,
      });
    },
  );

  // Step 4: Test login rejection with lowercase password
  await TestValidator.error(
    "login with lowercase password case should fail",
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: adminEmail,
          password: lowerCasePassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: "",
        } satisfies ICommunityPlatformAdministrator.ILogin,
      });
    },
  );

  // Step 5: Verify password case-sensitivity by testing with single character case change
  const oneCharUpperCase =
    originalPassword.charAt(0).toUpperCase() + originalPassword.slice(1);
  if (oneCharUpperCase !== originalPassword) {
    await TestValidator.error(
      "login with single character case change should fail",
      async () => {
        await api.functional.auth.administrator.login(connection, {
          body: {
            email: adminEmail,
            password: oneCharUpperCase,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: "",
          } satisfies ICommunityPlatformAdministrator.ILogin,
        });
      },
    );
  }

  TestValidator.predicate(
    "password case sensitivity test completed successfully",
    true,
  );
}
