import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a newly registered user can update their own email, password,
 * and display name via the profile update endpoint.
 *
 * This test performs the following steps:
 *
 * 1. Register a new user account (POST /auth/user/join) to establish initial
 *    authentication and collect the userId.
 * 2. Prepare and perform a successful update of all profile fields via PUT
 *    /todoList/user/users/{userId}:
 *
 *    - Change the email (to another unique, random valid email)
 *    - Change the password (to a new strong password string)
 *    - Change the display_name (set to a random friendly name)
 * 3. Verify in the response that:
 *
 *    - The email was updated and reflects the new unique value
 *    - The display_name shows the newly set value
 *    - The id and created_at fields are unchanged, but updated_at is refreshed
 * 4. Perform a second update that clears the display_name to null, using the same
 *    endpoint, and verify it is removed (null).
 * 5. Check that all business validations and type-format requirements (email,
 *    password min length) are satisfied by the test data.
 */
export async function test_api_user_profile_update_self_success(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain authentication and initial user profile
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(12) + "A!";
  const initialDisplayName = RandomGenerator.name();
  const initialHref = "https://example.com/welcome";
  const initialReferrer = "https://google.com/";

  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: initialPassword satisfies string,
      href: initialHref,
      referrer: initialReferrer,
      display_name: initialDisplayName,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userJoin);
  // Use authorized fields for baseline
  const userId = userJoin.id;
  const createdAt = userJoin.created_at;
  const updatedAt1 = userJoin.updated_at;
  TestValidator.equals("email set on join", userJoin.email, initialEmail);
  TestValidator.equals(
    "display_name set on join",
    userJoin.display_name,
    initialDisplayName,
  );

  // 2. Update all modifiable fields: new email, new password, new display_name
  const updateEmail = typia.random<string & tags.Format<"email">>();
  const updatePassword = RandomGenerator.alphaNumeric(14) + "bB2_";
  const updateDisplayName = RandomGenerator.name();
  const updateResp = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: userId,
      body: {
        email: updateEmail,
        password: updatePassword satisfies string,
        display_name: updateDisplayName,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updateResp);
  TestValidator.equals("userId unchanged after update", updateResp.id, userId);
  TestValidator.equals(
    "email updated successfully",
    updateResp.email,
    updateEmail,
  );
  TestValidator.equals(
    "display_name updated successfully",
    updateResp.display_name,
    updateDisplayName,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    updateResp.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed after update",
    updateResp.updated_at,
    updatedAt1,
  );

  // 3. Confirm password cannot be checked directly but the change is accepted by server (no error)

  // 4. Now clear display_name to null and validate removal
  const updateResp2 = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: userId,
      body: {
        display_name: null,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updateResp2);
  TestValidator.equals(
    "display_name cleared (nullified)",
    updateResp2.display_name,
    null,
  );
  TestValidator.equals(
    "userId unchanged after clearing display_name",
    updateResp2.id,
    userId,
  );
  TestValidator.equals(
    "email remains after display_name cleared",
    updateResp2.email,
    updateEmail,
  );
  TestValidator.notEquals(
    "updated_at changed after clearing display_name",
    updateResp2.updated_at,
    updateResp.updated_at,
  );
}
