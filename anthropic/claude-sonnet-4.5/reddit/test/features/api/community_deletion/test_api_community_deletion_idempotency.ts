import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test idempotency of community deletion operations.
 *
 * This test validates that attempting to delete an already-deleted community
 * returns an appropriate error response and maintains proper idempotency
 * characteristics. The test ensures that duplicate deletion attempts are
 * handled gracefully with clear error messages.
 *
 * Test workflow:
 *
 * 1. Create moderator account
 * 2. Create a community
 * 3. Delete the community successfully (first deletion)
 * 4. Attempt to delete the same community again
 * 5. Verify the second deletion returns an appropriate error
 * 6. Confirm the deleted_at timestamp is set on first deletion
 */
export async function test_api_community_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Delete the community successfully (first deletion)
  const deletedCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.eraseByCommunityname(
      connection,
      {
        communityName: communityName,
      },
    );
  typia.assert(deletedCommunity);

  // Verify the community was deleted and has deleted_at timestamp set
  TestValidator.predicate(
    "deleted community should have deleted_at timestamp",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );

  // Step 4: Attempt to delete the same community again (second deletion)
  await TestValidator.error(
    "second deletion attempt should fail with error",
    async () => {
      await api.functional.redditCommunity.moderator.communities.eraseByCommunityname(
        connection,
        {
          communityName: communityName,
        },
      );
    },
  );
}
