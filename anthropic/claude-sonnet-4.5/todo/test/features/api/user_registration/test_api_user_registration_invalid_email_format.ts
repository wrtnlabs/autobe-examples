import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with duplicate email addresses.
 *
 * Since the original scenario (testing invalid email formats) requires type
 * error testing which is absolutely prohibited, this test has been rewritten to
 * validate a legitimate business logic error: attempting to register with an
 * email address that already exists in the system.
 *
 * **Business Context:** The system must enforce email uniqueness to prevent
 * duplicate accounts. When a user attempts to register with an email that
 * already exists, the API should reject the request with an appropriate error.
 *
 * **Test Workflow:**
 *
 * 1. Register the first user successfully with a valid email
 * 2. Verify the registration succeeded and tokens were issued
 * 3. Attempt to register a second user with the same email address
 * 4. Verify the duplicate registration attempt fails with an error
 * 5. Confirm the error occurs due to email uniqueness constraint
 *
 * This tests the business rule that email addresses must be unique across all
 * user accounts in the todo_list_users table.
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate valid registration data for first user
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Successfully register the first user
  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: password1,
      href: href,
      referrer: referrer,
    } satisfies ITodoListUser.ICreate,
  });

  // Verify first registration succeeded
  typia.assert(firstUser);
  TestValidator.equals(
    "first user email matches registration email",
    firstUser.email,
    email,
  );

  // Generate different password for second registration attempt
  const password2 = typia.random<string & tags.MinLength<8>>();

  // Attempt to register second user with the same email (duplicate)
  await TestValidator.error(
    "registration should fail with duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: email,
          password: password2,
          href: href,
          referrer: referrer,
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
