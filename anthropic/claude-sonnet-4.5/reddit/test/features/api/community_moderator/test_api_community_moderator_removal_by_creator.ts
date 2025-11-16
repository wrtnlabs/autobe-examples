import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete workflow of removing a moderator from a community by the
 * community creator.
 *
 * This test validates that a community creator can successfully revoke
 * moderation privileges from an appointed moderator. The test creates a
 * community with the creator moderator, appoints another moderator to the
 * community, then removes that moderator using the DELETE endpoint.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a moderator (community creator)
 * 2. Create a community as the authenticated moderator
 * 3. Register a second moderator account
 * 4. Appoint the second moderator to the community
 * 5. Remove the appointed moderator from the community
 * 6. Validate the removal response and metadata
 */
export async function test_api_community_moderator_removal_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as community creator moderator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "SecurePass123!";
  const creatorNickname = RandomGenerator.name();

  const creator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      nickname: creatorNickname,
      href: "https://test.example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create a community as the creator moderator
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Register a second moderator to be appointed to the community
  const secondModeratorEmail = typia.random<string & tags.Format<"email">>();
  const secondModeratorPassword = "ModeratorPass456!";
  const secondModeratorNickname = RandomGenerator.name();

  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: secondModeratorEmail,
      password: secondModeratorPassword,
      nickname: secondModeratorNickname,
      href: "https://test.example.com/moderator-register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(secondModerator);

  // Step 4: Re-authenticate as creator to appoint the second moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://test.example.com/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Appoint the second moderator to the community
  const appointedModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: secondModeratorEmail,
          password: secondModeratorPassword,
          nickname: secondModeratorNickname,
          href: "https://test.example.com/appoint" satisfies string &
            tags.Format<"uri">,
          referrer: "https://test.example.com/community" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(appointedModerator);

  // Step 5: Remove the appointed moderator from the community
  const removedModerator =
    await api.functional.redditCommunity.moderator.communities.moderators.erase(
      connection,
      {
        communityName: community.name,
        username: appointedModerator.username,
      },
    );
  typia.assert(removedModerator);

  // Step 6: Validate the removal
  TestValidator.equals(
    "removed moderator ID matches",
    removedModerator.id,
    appointedModerator.id,
  );
  TestValidator.equals(
    "removed moderator username matches",
    removedModerator.username,
    appointedModerator.username,
  );
  TestValidator.equals(
    "removed moderator email matches",
    removedModerator.email,
    appointedModerator.email,
  );
}
