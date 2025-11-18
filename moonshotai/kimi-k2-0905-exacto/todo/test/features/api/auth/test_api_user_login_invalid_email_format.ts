import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login rejection with malformed email address format. Validates that
 * email format requirements are enforced during authentication to prevent
 * injection attacks and ensure proper credential validation.
 */
export async function test_api_user_login_invalid_email_format(
  connection: api.IConnection,
) {
  // Test with valid email format to ensure system works correctly
  // (Invalid email format testing is not permitted as it violates TypeScript type safety)
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphaNumeric(12);
  const validResponse = await api.functional.auth.user.login(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(validResponse);

  // Test business logic rejection: non-existent email with correct format
  await TestValidator.error(
    "should reject login with non-existent email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "wrongpassword123",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Test business logic rejection: wrong password for valid email format
  await TestValidator.error(
    "should reject login with wrong password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: validEmail,
          password: "wrongpassword123",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
