import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration failure when attempting to register with a duplicate
 * email address.
 *
 * This test validates the email uniqueness enforcement in the todo_list_users
 * table. The system must reject registration attempts when an email address
 * already exists, including case-insensitive matching since emails are
 * normalized to lowercase.
 *
 * Steps:
 *
 * 1. Register first user with a specific email address (should succeed)
 * 2. Attempt to register second user with exact same email (should fail)
 * 3. Attempt to register with case-variant email (should also fail)
 * 4. Verify all duplicate attempts are rejected with appropriate errors
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Generate unique email for first user
  const baseEmail = typia.random<string & tags.Format<"email">>();

  // First registration - should succeed
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: baseEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Second registration with exact same email - should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: baseEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Third registration with case-variant email - should also fail
  const caseVariantEmail = baseEmail.toUpperCase();

  await TestValidator.error(
    "case-variant duplicate email should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: caseVariantEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
