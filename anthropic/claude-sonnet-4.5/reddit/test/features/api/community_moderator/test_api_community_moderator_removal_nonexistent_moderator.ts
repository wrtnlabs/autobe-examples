import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test moderator removal behavior when attempting to remove a non-existent
 * moderator relationship.
 *
 * This test validates error handling when the specified moderator-community
 * relationship does not exist. Creates a community with a creator moderator,
 * creates a member who has never been appointed as moderator, then attempts to
 * remove that member as a moderator. Validates that the operation returns an
 * appropriate error response (404 Not Found) indicating the moderator
 * relationship does not exist, preventing deletion of non-existent
 * relationships.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a community creator moderator
 * 2. Create a community (creator becomes the first moderator)
 * 3. Create a regular member who is NOT a moderator
 * 4. Attempt to remove the non-moderator from the community
 * 5. Validate that the operation fails with appropriate error
 */
export async function test_api_community_moderator_removal_nonexistent_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate community creator moderator
  const creatorModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const creatorModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: creatorModeratorData,
    },
  );
  typia.assert<IRedditCommunityCommunityModerator.IAuthorized>(
    creatorModerator,
  );

  // Step 2: Create a community for testing
  const communityData = {
    name: RandomGenerator.alphabets(10).toLowerCase() satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">,
    display_title: RandomGenerator.name(2) satisfies string &
      tags.MaxLength<100>,
    description: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
      tags.MaxLength<500>,
    rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
      tags.MaxLength<500>,
    icon_url: null,
    banner_url: null,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert<IRedditCommunityCommunity>(community);

  // Step 3: Create a regular member who is NOT a moderator
  const memberData = {
    username: RandomGenerator.alphabets(10).toLowerCase() satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<50>,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name() satisfies
      | (string & tags.MaxLength<50>)
      | null
      | undefined,
    bio: null,
    avatar_url: null,
    show_online_status: undefined,
    show_subscribed_communities: undefined,
    show_activity_feed: undefined,
    ip: null,
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert<IRedditCommunityGuest.IAuthorized>(member);

  // Step 4: Attempt to remove the non-moderator member from the community
  // This should fail because the member was never appointed as a moderator
  await TestValidator.error(
    "should fail when removing non-existent moderator relationship",
    async () => {
      await api.functional.redditCommunity.moderator.communities.moderators.erase(
        connection,
        {
          communityName: community.name,
          username: member.username,
        },
      );
    },
  );
}
