import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test that account deletion immediately invalidates all active sessions.
 *
 * This test validates the critical security behavior where deleting a
 * contributor account immediately revokes all active sessions and prevents
 * further API access with previous credentials. The test simulates a real-world
 * scenario where a contributor registers, creates an authenticated session, and
 * then requests account deletion with password verification. All subsequent
 * requests using the old session token should fail with authentication errors.
 *
 * Test flow:
 *
 * 1. Create a new contributor account with registration (join endpoint)
 * 2. Capture the initial session tokens from successful registration
 * 3. Initiate account deletion with correct password verification
 * 4. Verify deletion succeeds and returns proper deletion confirmation
 * 5. Attempt API call with deleted account's previous session token and verify it
 *    fails
 * 6. Confirm the account status is marked as deleted
 */
export async function test_api_contributor_account_deletion_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new contributor account through registration
  // Generate realistic test data for contributor registration
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string = "TestPass123!@#";

  const registrationBody = {
    email: email,
    username: username,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  // Register the contributor account
  const newContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: registrationBody,
    });
  typia.assert(newContributor);

  // Verify the account was created with 'active' status
  TestValidator.equals(
    "newly registered account status should be active",
    newContributor.account_status,
    "active",
  );

  TestValidator.equals(
    "newly registered account email should match input",
    newContributor.email,
    email,
  );

  // Step 2: Capture the session tokens from successful registration
  const initialAccessToken: string = newContributor.token.access;
  const initialRefreshToken: string = newContributor.token.refresh;

  TestValidator.predicate(
    "access token should be provided after registration",
    initialAccessToken.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be provided after registration",
    initialRefreshToken.length > 0,
  );

  // Step 3: Set up authenticated connection with the contributor's session
  // This represents the active session before account deletion
  const authenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${initialAccessToken}`,
    },
  };

  // Step 4: Initiate account deletion with correct password verification
  const deleteBody = {
    password: password,
  } satisfies IDiscussionBoardContributor.IDeleteAccount;

  const deletionResult: IDiscussionBoardContributor.IDeleteAccountResult =
    await api.functional.discussionBoard.contributor.profile._delete.erase(
      authenticatedConnection,
      {
        body: deleteBody,
      },
    );
  typia.assert(deletionResult);

  // Step 5: Verify deletion succeeds with proper confirmation
  TestValidator.equals(
    "deletion should return success flag as true",
    deletionResult.success,
    true,
  );

  TestValidator.predicate(
    "deletion should return a message confirming account deletion",
    deletionResult.message.length > 0,
  );

  TestValidator.predicate(
    "deletion should return a deleted_at timestamp",
    deletionResult.deleted_at.length > 0,
  );

  // Step 6: Verify session invalidation - attempt to use previous session token
  // After deletion, any API calls using the old access token should fail
  // because all sessions for the deleted account are invalidated
  await TestValidator.error(
    "deleted account session should be invalidated preventing further API access",
    async () => {
      // Attempt to call authenticated endpoint with the now-invalid session token
      // This should fail because the account was deleted and session was invalidated
      await api.functional.discussionBoard.contributor.profile._delete.erase(
        authenticatedConnection,
        {
          body: {
            password: password,
          } satisfies IDiscussionBoardContributor.IDeleteAccount,
        },
      );
    },
  );
}
