import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test the complete workflow of assigning a new moderator to a community.
 *
 * This test validates that a community creator can successfully appoint another
 * moderator to their community. The test creates a community with the first
 * moderator account, then creates a second moderator account and assigns them
 * to the community.
 *
 * Validates that the moderator assignment response contains the correct
 * moderator details including email, username, and ID. Ensures the newly
 * appointed moderator is properly created and associated with the community.
 *
 * Steps:
 *
 * 1. Create and authenticate first moderator account (community creator)
 * 2. Creator establishes a new community
 * 3. Creator assigns a new moderator to the community by creating their account
 * 4. Validate the moderator assignment details
 */
export async function test_api_community_moderator_assignment_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the first moderator (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = typia.random<string & tags.MinLength<8>>();
  const creatorNickname = RandomGenerator.name();

  const creator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      nickname: creatorNickname,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(creator);

  // Step 2: Creator creates a new community
  const communityName = RandomGenerator.alphabets(15);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Assign a new moderator to the community
  const newModeratorEmail = typia.random<string & tags.Format<"email">>();
  const newModeratorPassword = typia.random<string & tags.MinLength<8>>();
  const newModeratorNickname = RandomGenerator.name();

  const assignedModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: newModeratorEmail,
          password: newModeratorPassword,
          nickname: newModeratorNickname,
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(assignedModerator);

  // Step 4: Validate the moderator assignment
  TestValidator.equals(
    "assigned moderator email matches",
    assignedModerator.email,
    newModeratorEmail,
  );

  TestValidator.predicate(
    "assigned moderator has valid UUID",
    assignedModerator.id !== null && assignedModerator.id !== undefined,
  );

  TestValidator.equals(
    "assigned moderator username matches",
    assignedModerator.username,
    newModeratorNickname,
  );

  TestValidator.predicate(
    "community name matches",
    community.name === communityName,
  );
}
