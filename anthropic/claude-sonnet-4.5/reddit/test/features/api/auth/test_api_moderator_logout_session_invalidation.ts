import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator logout session invalidation.
 *
 * This test validates that moderator logout successfully invalidates the
 * current session and prevents further use of authentication tokens. The test
 * creates a moderator account, authenticates to obtain JWT tokens, performs a
 * logout operation, and verifies that the session is properly invalidated by
 * attempting to use the invalidated access token for another operation.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account and obtain JWT tokens
 * 2. Verify the moderator is authenticated with valid tokens
 * 3. Perform logout operation and verify success confirmation
 * 4. Attempt to use the invalidated token for an authenticated operation
 * 5. Verify that the system rejects the invalidated token with authentication
 *    error
 */
export async function test_api_moderator_logout_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account with valid credentials
  const createData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createData,
    });

  // Step 2: Verify the moderator account was created successfully
  typia.assert(moderator);
  TestValidator.equals(
    "username matches",
    moderator.username,
    createData.username,
  );
  TestValidator.equals("email matches", moderator.email, createData.email);
  TestValidator.predicate(
    "has valid access token",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    moderator.token.refresh.length > 0,
  );

  // Step 3: Perform logout operation
  const logoutConfirmation: IRedditLikeModerator.ILogoutConfirmation =
    await api.functional.auth.moderator.logout(connection);

  // Step 4: Verify logout confirmation response
  typia.assert(logoutConfirmation);
  TestValidator.equals("logout success", logoutConfirmation.success, true);
  TestValidator.predicate(
    "logout message exists",
    logoutConfirmation.message.length > 0,
  );

  // Step 5: Attempt to use the invalidated token for another operation
  // The connection still has the old (now invalidated) access token in headers
  // This should fail with an authentication error
  await TestValidator.error(
    "invalidated token should be rejected",
    async () => {
      await api.functional.auth.moderator.logout(connection);
    },
  );
}
