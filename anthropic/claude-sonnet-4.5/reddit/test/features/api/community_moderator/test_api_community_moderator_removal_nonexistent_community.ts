import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator removal from a nonexistent community.
 *
 * This test validates that the API properly handles attempts to remove a
 * moderator from a community that does not exist in the database. It ensures
 * that appropriate error handling is in place for invalid community
 * references.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Attempt to remove a moderator from a nonexistent community
 * 3. Verify that the operation fails with an appropriate error
 */
export async function test_api_community_moderator_removal_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a nonexistent community name
  const nonexistentCommunityName = `nonexistent_${RandomGenerator.alphaNumeric(12)}`;

  // Step 3: Generate a random username for the moderator to remove
  const usernameToRemove = RandomGenerator.name(1);

  // Step 4: Attempt to remove a moderator from the nonexistent community
  // This should fail because the community does not exist
  await TestValidator.error(
    "removing moderator from nonexistent community should fail",
    async () => {
      await api.functional.redditCommunity.moderator.communities.moderators.erase(
        connection,
        {
          communityName: nonexistentCommunityName,
          username: usernameToRemove,
        },
      );
    },
  );
}
