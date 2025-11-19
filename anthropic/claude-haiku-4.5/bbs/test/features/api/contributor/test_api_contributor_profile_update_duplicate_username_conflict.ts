import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test username uniqueness constraint enforcement during profile updates.
 *
 * This test validates that the API properly enforces the uniqueness constraint
 * on contributor usernames. Two contributors are registered with different
 * usernames. The first contributor then attempts to update their username to
 * match the second contributor's already-existing username. The API should
 * reject this attempt with HTTP 409 Conflict error, clearly indicating the
 * username field caused the conflict. The profile must remain unchanged after a
 * failed validation attempt.
 *
 * Process:
 *
 * 1. Register first contributor with unique username
 * 2. Register second contributor with different username
 * 3. First contributor attempts to update username to match second's username
 * 4. Verify HTTP 409 Conflict error is returned
 * 5. Verify first contributor's profile remains unchanged
 * 6. Verify error indicates username field conflict
 */
export async function test_api_contributor_profile_update_duplicate_username_conflict(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor with unique username
  const firstContributorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const firstContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: firstContributorData,
    });
  typia.assert(firstContributor);

  // Store original username for later verification
  const originalFirstUsername = firstContributor.username;

  // Step 2: Register second contributor with different username
  const secondContributorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePass456!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const secondContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: secondContributorData,
    });
  typia.assert(secondContributor);

  // Step 3: Verify both contributors have different usernames
  TestValidator.notEquals(
    "contributors should have different usernames",
    firstContributor.username,
    secondContributor.username,
  );

  // Step 4: Re-authenticate as first contributor for profile update
  // Use same connection that will be set to first contributor's auth token
  const firstContributorConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await api.functional.auth.contributor.join(firstContributorConnection, {
    body: firstContributorData,
  });

  // Step 5: Attempt to update first contributor's username to second's username
  // This should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "should return 409 Conflict when updating to duplicate username",
    409,
    async () => {
      return await api.functional.discussionBoard.contributor.profile.update(
        firstContributorConnection,
        {
          body: {
            username: secondContributor.username,
          } satisfies IDiscussionBoardUser.IUpdate,
        },
      );
    },
  );

  // Step 6: Verify first contributor's profile remains unchanged
  // Make an empty update call to retrieve current profile
  const profileAfterFailedUpdate: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.update(
      firstContributorConnection,
      {
        body: {} satisfies IDiscussionBoardUser.IUpdate,
      },
    );
  typia.assert(profileAfterFailedUpdate);

  // Step 7: Verify the username remained unchanged
  TestValidator.equals(
    "first contributor username should remain unchanged after failed update",
    profileAfterFailedUpdate.username,
    originalFirstUsername,
  );
}
