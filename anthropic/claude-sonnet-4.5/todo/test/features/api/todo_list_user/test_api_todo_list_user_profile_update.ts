import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate updating a user's profile via PUT /todoList/users/{userId}.
 *
 * 1. Register a new user to obtain a valid userId, check initial profile.
 * 2. Update user's email to another unique value and verify the change.
 * 3. Ensure the uniqueness constraint: try updating to a duplicate email and
 *    expect failure.
 * 4. Toggle disabled_at (set to non-null to disable, null to re-enable), check
 *    updated status.
 * 5. Attempt forbidden/invalid property update (e.g., extra fields, id, password)
 *    and confirm API ignores/rejects modification.
 * 6. All operations are validated for correct business behavior and schema
 *    compliance.
 */
export async function test_api_todo_list_user_profile_update(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail1 = typia.random<string & tags.Format<"email">>();
  const joinBody1 = {
    email: userEmail1,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/welcome",
  } satisfies ITodoListUser.IJoin;
  const authUser1 = await api.functional.auth.user.join(connection, {
    body: joinBody1,
  });
  typia.assert(authUser1);
  TestValidator.equals("email matches on join", authUser1.email, userEmail1);
  TestValidator.equals("active account on join", authUser1.disabled_at, null);

  // 2. Update user's email to another unique value
  const userId = authUser1.id;
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateResult = await api.functional.todoList.users.update(connection, {
    userId,
    body: { email: newEmail } satisfies ITodoListUser.IUpdate,
  });
  typia.assert(updateResult);
  TestValidator.equals("email updated", updateResult.email, newEmail);
  TestValidator.equals("user id unchanged", updateResult.id, userId);

  // 3. Register a second user for duplicate email testing
  const userEmail2 = typia.random<string & tags.Format<"email">>();
  const joinBody2 = {
    email: userEmail2,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/join",
    referrer: "https://example.com/welcome",
  } satisfies ITodoListUser.IJoin;
  const authUser2 = await api.functional.auth.user.join(connection, {
    body: joinBody2,
  });
  typia.assert(authUser2);
  TestValidator.equals("second user registered", authUser2.email, userEmail2);

  // 4. Attempt to update user1 with duplicate email (should error)
  await TestValidator.error("cannot set duplicate email for user", async () => {
    await api.functional.todoList.users.update(connection, {
      userId,
      body: { email: userEmail2 } satisfies ITodoListUser.IUpdate,
    });
  });

  // 5. Disable the account by setting disabled_at to a timestamp
  const disabledAt = new Date().toISOString();
  const disableResult = await api.functional.todoList.users.update(connection, {
    userId,
    body: { disabled_at: disabledAt } satisfies ITodoListUser.IUpdate,
  });
  typia.assert(disableResult);
  TestValidator.equals(
    "user disabled_at set",
    disableResult.disabled_at,
    disabledAt,
  );

  // 6. Re-enable the account by setting disabled_at to null
  const enableResult = await api.functional.todoList.users.update(connection, {
    userId,
    body: { disabled_at: null } satisfies ITodoListUser.IUpdate,
  });
  typia.assert(enableResult);
  TestValidator.equals(
    "user disabled_at cleared (re-enabled)",
    enableResult.disabled_at,
    null,
  );

  // 7. Attempt to update forbidden/id fields (should be ignored or result in error, never modifies forbidden properties)
  // As schema does not allow id field update, attempt to pass id and verify it is ignored
  const badUpdateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    id: "some-id-should-be-ignored",
  } as unknown as ITodoListUser.IUpdate;
  const forbiddenResult = await api.functional.todoList.users.update(
    connection,
    {
      userId,
      body: badUpdateBody,
    },
  );
  typia.assert(forbiddenResult);
  TestValidator.equals(
    "user id remains unchanged after forbidden field update",
    forbiddenResult.id,
    userId,
  );
}
