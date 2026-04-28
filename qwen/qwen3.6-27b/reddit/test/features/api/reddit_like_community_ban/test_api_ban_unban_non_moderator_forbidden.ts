import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test that regular members without moderator authority cannot lift bans (authorization enforcement).
 *
 * Validates that only community moderators and owners have the authority to lift bans. A regular member who joined independently has no moderation role in the community should be rejected when attempting to unban a user.
 *
 * 1. Owner authenticates and creates a community.
 * 2. Target member authenticates as a separate account.
 * 3. Owner creates a ban against the target member in the community.
 * 4. Non-moderator authenticates as a third, unrelated member with no moderator or owner role.
 * 5. Non-moderator attempts to delete the ban using the valid banId.
 * 6. System rejects with 403 Forbidden, confirming authorization enforcement.
 */
export async function test_api_ban_unban_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Owner creates community
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_uri: null,
        },
      },
    );
  typia.assert(community);
  // 3. Target member authenticates - capture return to get member ID
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(targetConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(targetAuthorized);
  // 4. Owner creates ban on target member using target's member ID
  const ban: IREdditLikeCommunityCommunityBan =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: targetAuthorized.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // 5. Non-moderator authenticates as a completely different member
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6 & 7. Non-moderator attempts to delete the ban - should get 403 Forbidden
  await TestValidator.httpError(
    "non-moderator unban forbidden",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.bans.eraseByBanid(
        nonModeratorConnection,
        {
          banId: ban.id,
        },
      );
    },
  );
}
