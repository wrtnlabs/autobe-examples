import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

/**
 * Test multiple moderators issuing bans in the same community.
 *
 * This test validates:
 * 1. Multiple moderators can be assigned to the same community
 * 2. Each moderator can ban users independently
 * 3. Ban list shows all bans from all moderators combined
 * 4. The bannedBy field correctly identifies which moderator issued each ban
 * 5. Filtering by banned_by_member_id returns only bans from that moderator
 */
export async function test_api_community_ban_list_multiple_moderators(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first moderator and authenticate
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModerator = await authorize_member_join(firstModeratorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(firstModerator);
  // Step 2: Create community owned by first moderator
  const community =
    await generate_random_reddit_platform_member_communities_create(
      firstModeratorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create second moderator and authenticate
  const secondModeratorConnection: api.IConnection = { host: connection.host };
  const secondModerator = await authorize_member_join(
    secondModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(secondModerator);
  // Step 4: Assign second moderator to the community
  const secondModeratorAssignment =
    await generate_random_reddit_platform_member_communities_moderators_create(
      firstModeratorConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: secondModerator.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);
  // Step 5: Create first target member to be banned by first moderator
  const firstTargetConnection: api.IConnection = { host: connection.host };
  const firstTarget = await authorize_member_join(firstTargetConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(firstTarget);
  // Step 6: First moderator bans first target
  const firstBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      firstModeratorConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_platform_member_id: firstTarget.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(firstBan);
  // Step 7: Create second target member to be banned by second moderator
  const secondTargetConnection: api.IConnection = { host: connection.host };
  const secondTarget = await authorize_member_join(secondTargetConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(secondTarget);
  // Step 8: Second moderator bans second target
  const secondBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      secondModeratorConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_platform_member_id: secondTarget.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(secondBan);
  // Step 9: Retrieve ban list and verify both bans appear
  const banList =
    await api.functional.redditPlatform.member.communities.bans.index(
      firstModeratorConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(banList);
  // Verify both bans are in the list
  TestValidator.equals("ban list count", banList.data.length, 2);
  // Verify first ban details
  const foundFirstBan = banList.data.find((b) => b.id === firstBan.id);
  TestValidator.predicate("first ban exists", foundFirstBan !== undefined);
  if (foundFirstBan) {
    TestValidator.equals(
      "first ban banned user",
      foundFirstBan.member.id,
      firstTarget.id,
    );
    TestValidator.equals(
      "first ban issued by",
      foundFirstBan.bannedBy.id,
      firstModerator.id,
    );
  }
  // Verify second ban details
  const foundSecondBan = banList.data.find((b) => b.id === secondBan.id);
  TestValidator.predicate("second ban exists", foundSecondBan !== undefined);
  if (foundSecondBan) {
    TestValidator.equals(
      "second ban banned user",
      foundSecondBan.member.id,
      secondTarget.id,
    );
    TestValidator.equals(
      "second ban issued by",
      foundSecondBan.bannedBy.id,
      secondModerator.id,
    );
  }
  // Step 10: Filter by first moderator and verify only their ban appears
  const filteredByFirstModerator =
    await api.functional.redditPlatform.member.communities.bans.index(
      firstModeratorConnection,
      {
        communityId: community.id,
        body: {
          banned_by_member_id: firstModerator.id,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(filteredByFirstModerator);
  TestValidator.equals(
    "filtered by first moderator count",
    filteredByFirstModerator.data.length,
    1,
  );
  TestValidator.equals(
    "filtered ban issued by first moderator",
    filteredByFirstModerator.data[0].bannedBy.id,
    firstModerator.id,
  );
  // Step 11: Filter by second moderator and verify only their ban appears
  const filteredBySecondModerator =
    await api.functional.redditPlatform.member.communities.bans.index(
      firstModeratorConnection,
      {
        communityId: community.id,
        body: {
          banned_by_member_id: secondModerator.id,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(filteredBySecondModerator);
  TestValidator.equals(
    "filtered by second moderator count",
    filteredBySecondModerator.data.length,
    1,
  );
  TestValidator.equals(
    "filtered ban issued by second moderator",
    filteredBySecondModerator.data[0].bannedBy.id,
    secondModerator.id,
  );
}