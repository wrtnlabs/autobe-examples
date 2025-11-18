import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of a todo list user's own account details with role isolation.
 *
 * This test covers the user workflow and privacy enforcement:
 *
 * 1. Register one user (user A) and log in, capturing userId and establishing auth
 *    context.
 * 2. Retrieve the account info for this user (GET /todoList/user/users/{userId}
 *    with their own ID).
 * 3. Validate that all required fields are present: id (uuid), email (email),
 *    is_locked (boolean), created_at (date-time), updated_at (date-time), and
 *    that there are no authentication or sensitive fields exposed.
 * 4. Confirm that the returned data exactly matches what was registered.
 * 5. Confirm that privileged access is not permitted: user A cannot access another
 *    user's info (create user B, then with user A's session, attempt to access
 *    user B's details and expect an error).
 * 6. Test that a locked user is shown as is_locked=true in the details (simulate
 *    by registering and then patching is_locked status through DB or
 *    presumptive API, or check field if always false for fresh user).
 * 7. Validate isolation - ensure no cross-user data leakage and that only the
 *    allowed account's details are returned.
 */
export async function test_api_todo_list_user_details_self_access(
  connection: api.IConnection,
) {
  // 1. Register user A
  const joinA = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(joinA);
  TestValidator.predicate(
    "joinA returns authorized user id",
    typeof joinA.id === "string" && joinA.id.length > 0,
  );

  // 2. User A retrieves their own details
  const selfDetails = await api.functional.todoList.user.users.at(connection, {
    userId: joinA.id,
  });
  typia.assert(selfDetails);
  TestValidator.equals("id matches joinA", selfDetails.id, joinA.id);
  TestValidator.equals("email matches joinA", selfDetails.email, joinA.email);
  TestValidator.equals(
    "is_locked property carried",
    selfDetails.is_locked,
    joinA.is_locked,
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    typeof selfDetails.created_at === "string" &&
      selfDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    typeof selfDetails.updated_at === "string" &&
      selfDetails.updated_at.length > 0,
  );

  // 3. Register user B
  const joinB = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(joinB);
  TestValidator.notEquals("user A and B must be distinct", joinA.id, joinB.id);

  // 4. User A attempts to retrieve user B's details (should fail, forbidden)
  await TestValidator.error(
    "user cannot access another user's details",
    async () => {
      await api.functional.todoList.user.users.at(connection, {
        userId: joinB.id,
      });
    },
  );

  // 5. (Edge) is_locked flag is always false for fresh users unless test fixture has system for user lock
  TestValidator.equals(
    "newly registered user is not locked",
    selfDetails.is_locked,
    false,
  );

  // 6. Ensure response shape: forbidden fields are NOT present
  TestValidator.predicate(
    "no sensitive/auth fields leaked in details",
    !("token" in selfDetails),
  );
}
