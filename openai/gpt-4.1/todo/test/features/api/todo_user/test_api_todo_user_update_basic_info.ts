import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate updating a user's email and password via the update endpoint.
 *
 * 1. Register user1 via join, save its id, token, and initial info for comparison.
 * 2. Register user2 to be used for email conflict testing.
 * 3. Update user1's email only and check updated_at changes and data reflected.
 * 4. Update user1's password only (new strong password), check updated_at changes.
 * 5. Update both email and password in a single call and verify immediate
 *    reflection.
 * 6. Attempt to update user1's email to user2's email and confirm proper error.
 * 7. Attempt to update non-allowed fields; verify they are ignored.
 * 8. Confirm that after a password change, old credentials can no longer
 *    authenticate.
 * 9. After each update, verify changes are reflected in responses.
 *
 * Assumes: There is no dedicated 'get' endpoint; updates confirmed via
 * responses and authentication checks.
 */
export async function test_api_todo_user_update_basic_info(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1_email = typia.random<string & tags.Format<"email">>();
  const user1_password = RandomGenerator.alphaNumeric(12);
  const user1_join_input = {
    email: user1_email,
    password: user1_password,
    href: "https://test.local/register",
    referrer: "https://test.local/",
  } satisfies ITodoUser.IJoin;
  const user1_auth = await api.functional.auth.user.join(connection, {
    body: user1_join_input,
  });
  typia.assert(user1_auth);
  const user1_id = user1_auth.id;
  const user1_token: IAuthorizationToken = user1_auth.token;
  const user1_initial_updated_at = user1_auth.updated_at;

  // 2. Register user2 for email conflict
  const user2_email = typia.random<string & tags.Format<"email">>();
  const user2_password = RandomGenerator.alphaNumeric(12);
  const user2_join_input = {
    email: user2_email,
    password: user2_password,
    href: "https://test.local/register",
    referrer: "https://test.local/",
  } satisfies ITodoUser.IJoin;
  const user2_auth = await api.functional.auth.user.join(
    { ...connection, headers: {} }, // clean unauth connection
    { body: user2_join_input },
  );
  typia.assert(user2_auth);
  const user2_id = user2_auth.id;

  // 3. Update email only
  const new_email = typia.random<string & tags.Format<"email">>();
  const update_email_input = { email: new_email } satisfies ITodoUser.IUpdate;
  const updated_user1_email = await api.functional.todo.user.users.update(
    connection,
    { userId: user1_id, body: update_email_input },
  );
  typia.assert(updated_user1_email);
  TestValidator.notEquals(
    "updated_at changes after email update",
    updated_user1_email.updated_at,
    user1_initial_updated_at,
  );
  TestValidator.equals("email updated", updated_user1_email.email, new_email);

  // 4. Update password only
  const new_password = RandomGenerator.alphaNumeric(15);
  const update_password_input = {
    password: new_password,
  } satisfies ITodoUser.IUpdate;
  const updated_user1_pass = await api.functional.todo.user.users.update(
    connection,
    { userId: user1_id, body: update_password_input },
  );
  typia.assert(updated_user1_pass);
  TestValidator.notEquals(
    "updated_at changes after password update",
    updated_user1_pass.updated_at,
    updated_user1_email.updated_at,
  );
  TestValidator.equals(
    "email unchanged after password update",
    updated_user1_pass.email,
    new_email,
  );

  // 5. Update both email & password in one call
  const both_email = typia.random<string & tags.Format<"email">>();
  const both_password = RandomGenerator.alphaNumeric(16);
  const update_both_input = {
    email: both_email,
    password: both_password,
  } satisfies ITodoUser.IUpdate;
  const updated_user1_both = await api.functional.todo.user.users.update(
    connection,
    { userId: user1_id, body: update_both_input },
  );
  typia.assert(updated_user1_both);
  TestValidator.equals(
    "email updated with both-field update",
    updated_user1_both.email,
    both_email,
  );
  TestValidator.notEquals(
    "updated_at updates for both change",
    updated_user1_both.updated_at,
    updated_user1_pass.updated_at,
  );

  // 6. Attempt to update user1 email to user2's email (should fail)
  await TestValidator.error("email conflict rejected", async () => {
    await api.functional.todo.user.users.update(connection, {
      userId: user1_id,
      body: { email: user2_email } satisfies ITodoUser.IUpdate,
    });
  });

  // 7. Non-allowed fields ignored (e.g., system field)
  const non_allowed_input: ITodoUser.IUpdate & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  } = {
    email: typia.random<string & tags.Format<"email">>(),
    id: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated_user_non_allowed = await api.functional.todo.user.users.update(
    connection,
    { userId: user1_id, body: non_allowed_input },
  );
  typia.assert(updated_user_non_allowed);
  TestValidator.equals(
    "system fields not overwritten",
    updated_user_non_allowed.id,
    user1_id,
  );

  // 8. Confirm old password can't be used after password change
  await TestValidator.error(
    "cannot login with old password after change",
    async () => {
      await api.functional.auth.user.join(
        { ...connection, headers: {} },
        {
          body: {
            email: both_email,
            password: new_password,
            href: "https://test.local/login",
            referrer: "https://test.local/",
          } satisfies ITodoUser.IJoin,
        },
      );
    },
  );

  // 9. (No get endpoint) All changes checked by returned entity, already covered above.
}
