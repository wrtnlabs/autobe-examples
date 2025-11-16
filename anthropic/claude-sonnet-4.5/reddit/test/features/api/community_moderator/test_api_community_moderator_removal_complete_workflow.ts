import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete moderator lifecycle including creation and removal with
 * multiple moderators.
 *
 * This test validates the end-to-end workflow of community moderation team
 * management:
 *
 * 1. Create and authenticate community creator moderator (first moderator)
 * 2. Create a community (creator becomes first moderator automatically)
 * 3. Create second moderator account and assign to community
 * 4. Create third moderator account and assign to community
 * 5. Create fourth moderator account and assign to community
 * 6. Remove the second moderator from the community
 * 7. Verify the removed moderator record is returned correctly
 * 8. Validate that moderator removal is properly executed
 */
export async function test_api_community_moderator_removal_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate community creator moderator
  const creatorModeratorEmail = typia.random<string & tags.Format<"email">>();
  const creatorModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: creatorModeratorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(creatorModerator);

  // Step 2: Create community (creator becomes first moderator automatically)
  const communityName = RandomGenerator.alphaNumeric(15);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
          banner_url: "https://example.com/banner.jpg" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // Step 3: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: moderator2Email,
          password: "ModeratorPassword123!",
          nickname: RandomGenerator.name(),
          ip: "192.168.1.2",
          href: "https://example.com/mod-signup" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/community" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator2);

  // Step 4: Create third moderator account
  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: moderator3Email,
          password: "ModeratorPassword456!",
          nickname: RandomGenerator.name(),
          ip: "192.168.1.3",
          href: "https://example.com/mod-signup" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/community" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator3);

  // Step 5: Create fourth moderator account
  const moderator4Email = typia.random<string & tags.Format<"email">>();
  const moderator4: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: moderator4Email,
          password: "ModeratorPassword789!",
          nickname: RandomGenerator.name(),
          ip: "192.168.1.4",
          href: "https://example.com/mod-signup" satisfies string &
            tags.Format<"uri">,
          referrer: "https://example.com/community" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator4);

  // Step 6: Remove the second moderator
  const removedModerator: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderator.communities.moderators.erase(
      connection,
      {
        communityName: community.name,
        username: moderator2.username,
      },
    );
  typia.assert(removedModerator);
  TestValidator.equals(
    "removed moderator ID matches",
    removedModerator.id,
    moderator2.id,
  );
  TestValidator.equals(
    "removed moderator username matches",
    removedModerator.username,
    moderator2.username,
  );
}
