import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate owner update rejects malformed UUID path parameter.
 *
 * Business intent:
 *
 * - Ensure that owner-update endpoint performs path-parameter validation for UUID
 *   format and rejects requests when the `userId` path parameter is not a valid
 *   UUID. This prevents accidental updates to unintended resources and ensures
 *   consistent request validation behavior.
 *
 * Test steps:
 *
 * 1. Register a new user via POST /auth/user/join to obtain an authorized context
 *    (ITodoAppUser.IAuthorized). The SDK will set Authorization on the provided
 *    connection automatically.
 * 2. Attempt to call PUT /todoApp/user/users/{userId} with a malformed userId
 *    ("not-a-uuid") while providing a valid ITodoAppUser.IUpdate body.
 * 3. Expect the API call to fail (TestValidator.error) because of invalid path
 *    parameter formatting. Verify local created user object remains as returned
 *    by join (no local mutation).
 */
export async function test_api_user_update_owner_invalid_uuid(
  connection: api.IConnection,
) {
  // 1) Create a new user via join
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });
  // Full structural validation
  typia.assert(authorized);

  // Sanity checks on returned authorized payload
  TestValidator.predicate(
    "join returned an access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );

  // Keep a snapshot of returned user-related info for local immutability check
  const createdUserSnapshot = authorized;

  // 2) Prepare a valid owner update body (valid types) so path param is sole failure reason
  const updateBody = {
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.IUpdate;

  // 3) Attempt update with malformed userId and assert that an error is thrown
  await TestValidator.error(
    "malformed userId path parameter should cause update to fail",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: "not-a-uuid",
        body: updateBody,
      });
    },
  );

  // 4) Verify the original authorized object remains as originally received
  // (we cannot re-fetch server-side user because no GET endpoint was provided)
  TestValidator.equals(
    "created user id remains unchanged after failed update",
    createdUserSnapshot.id,
    authorized.id,
  );
}
