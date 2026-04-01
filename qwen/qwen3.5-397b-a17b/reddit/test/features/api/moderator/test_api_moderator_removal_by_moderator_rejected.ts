import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test that moderators cannot remove other moderators from a community.
 *
 * This test validates the critical authorization boundary that only community owners
 * can remove moderators from the moderation team. Moderators should not have the
 * ability to remove other moderators, preventing interference with each other's roles.
 *
 * Test Flow:
 * 1. Create owner account and authenticate
 * 2. Create community owned by the owner
 * 3. Create two additional member accounts (moderator1 and moderator2)
 * 4. Add both members as moderators to the community (by owner)
 * 5. Attempt to remove moderator2 while authenticated as moderator1
 * 6. Verify the operation is rejected with error response
 */
export async function test_api_moderator_removal_by_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community owned by the owner
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create two additional member accounts for moderators
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1Auth = await authorize_member_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderator1Auth);
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2Auth = await authorize_member_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderator2Auth);
  // 4. Add both members as moderators to the community (by owner)
  const moderator1Record =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: moderator1Auth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator1Record);
  const moderator2Record =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          member_id: moderator2Auth.id,
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator2Record);
  // 5. Attempt to remove moderator2 while authenticated as moderator1
  // This should fail because only the owner can remove moderators
  await TestValidator.error(
    "moderator cannot remove other moderator",
    async () => {
      await api.functional.redditCommunity.member.communities.moderators.erase(
        moderator1Connection,
        {
          communityName: community.name,
          memberId: moderator2Auth.id,
        },
      );
    },
  );
}
