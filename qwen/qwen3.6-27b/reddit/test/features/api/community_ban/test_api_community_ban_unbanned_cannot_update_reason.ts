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
 * Test that a community ban reason cannot be updated after the ban has been erased (unbanned).
 *
 * Validates the workflow where a community owner bans a member, then erases the ban (unbanning them,
 * populating the deleted_at timestamp), and finally attempts to update the reason of this now-inactive ban record.
 * The system must reject the update request with an error (e.g., 409 Conflict), confirming that
 * only active bans (deleted_at IS NULL) can have their reason updated.
 *
 * 1. Administrator (community owner) registers and creates a community.
 * 2. Target member registers as a community participant.
 * 3. Administrator bans the target member, creating an active ban record.
 * 4. Administrator erases (unbans) the target member, setting deleted_at on the ban record.
 * 5. Administrator attempts to update the reason of the unbanned record.
 * 6. Validates that the system rejects the update with a 409 Conflict error.
 */
export async function test_api_community_ban_unbanned_cannot_update_reason(
  connection: api.IConnection,
) {
  // 1. Admin (Community Owner) setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(adminMember);
  // 1.1. Admin creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Target Member setup
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Admin bans the target member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      adminConnection,
      {
        body: {
          member_id: targetMember.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // 4. Admin erases (unbans) the target member
  await api.functional.redditLikeCommunity.member.communities.community_bans.erase(
    adminConnection,
    {
      communityId: community.id,
      communityBanId: ban.id,
    },
  );
  // 5 & 6. Admin attempts to update the reason of the unbanned record
  // This should fail with 409 Conflict because the ban is no longer active (deleted_at is populated)
  await TestValidator.httpError(
    "unbanned ban cannot have reason updated",
    [409],
    async () => {
      await api.functional.redditLikeCommunity.member.communities.community_bans.update(
        adminConnection,
        {
          communityId: community.id,
          communityBanId: ban.id,
          body: {
            reason: "Updated reason for unbanned ban",
          } satisfies IREdditLikeCommunityCommunityBan.IUpdate,
        },
      );
    },
  );
}
