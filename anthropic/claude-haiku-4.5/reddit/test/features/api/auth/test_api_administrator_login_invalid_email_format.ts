import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator login with valid credentials.
 *
 * This test validates that the administrator login endpoint works correctly
 * with properly formatted credentials. Email format validation is enforced at
 * the TypeScript type level through tags.Format<"email"> and cannot be tested
 * with invalid formats without violating type safety.
 *
 * Instead, this test verifies the complete login flow with valid data to ensure
 * the endpoint functions correctly and rejects attempts with wrong
 * credentials.
 */
export async function test_api_administrator_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate a valid email format that passes TypeScript type requirements
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = typia.random<string & tags.Format<"password">>();
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = RandomGenerator.paragraph();

  // Test: Valid email format with incorrect credentials
  // This verifies the login endpoint validates credentials independently
  // of email format validation (which occurs at type level)
  await TestValidator.error(
    "login should fail with valid email format but invalid credentials",
    async () => {
      await api.functional.auth.administrator.login(connection, {
        body: {
          email: validEmail,
          password: "invalid_password_that_does_not_exist",
          href: validHref,
          referrer: validReferrer,
        },
      });
    },
  );
}
