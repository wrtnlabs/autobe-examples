import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that an authenticated user can update their email through their
 * profile, and the system enforces email uniqueness.
 *
 * Business scenario:
 *
 * 1. Register user1 and receive tokens.
 * 2. Register user2 with a different email to establish uniqueness constraint.
 * 3. User1 updates their email to a new, unique address – expect successful update
 *    and profile reflects new email.
 * 4. User1 attempts to update email to user2's email – expect failure due to
 *    uniqueness protection.
 */
export async function test_api_user_profile_update_email(
  connection: api.IConnection,
) {
  // 1. Register user1
  const href: string = "https://testsuite.example.com/registration";
  const referrer: string = "https://testsuite.example.com/landing";
  const user1_email: string = typia.random<string & tags.Format<"email">>();
  const user1_password: string = RandomGenerator.alphaNumeric(10);
  const user1_join = await api.functional.auth.user.join(connection, {
    body: {
      email: user1_email,
      password: user1_password,
      href,
      referrer,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user1_join);

  // 2. Register user2
  const user2_email: string = typia.random<string & tags.Format<"email">>();
  const user2_password: string = RandomGenerator.alphaNumeric(10);
  const user2_join = await api.functional.auth.user.join(connection, {
    body: {
      email: user2_email,
      password: user2_password,
      href,
      referrer,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(user2_join);

  // 3. User1 updates their email to a new, unique address
  const user1_new_email: string = typia.random<string & tags.Format<"email">>();
  const profile_updated = await api.functional.todoList.user.users.me.update(
    connection,
    {
      body: {
        email: user1_new_email,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(profile_updated);
  TestValidator.equals(
    "profile email has changed to user1_new_email",
    profile_updated.email,
    user1_new_email,
  );
  TestValidator.equals(
    "created_at remains unchanged after email update",
    profile_updated.created_at,
    user1_join.created_at,
  );

  // 4. User1 attempts to update their email to user2's email – expect failure
  await TestValidator.error(
    "cannot update to duplicate email (user2_email)",
    async () => {
      await api.functional.todoList.user.users.me.update(connection, {
        body: {
          email: user2_email,
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}
