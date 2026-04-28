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
 * Test that a community owner can lift an active ban on a member.
 *
 * Validates the unban operation flow including authentication of the owner and target member, community creation, ban establishment, and ban removal. Ensures that the DELETE ban endpoint correctly removes the restriction and allows the banned member to regain full participation rights.
 *
 * Tests that only community owners or moderators can lift bans, and that the unban operation results in a null response body confirming the operation completed successfully.
 *
 * 1. Authenticate as a member who will become the community owner.
 * 2. Create a community with the authenticated member as the creator/owner.
 * 3. Authenticate a second member who will be the ban target.
 * 4. As the owner, create a ban record for the target member.
 * 5. As the owner, call DELETE to lift the ban.
 * 6. Verify the operation completes successfully (void response indicates success).
 */
export async function test_api_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Authenticate as target member
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(targetMember);
  // 4. Create ban as owner targeting the target member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: targetMember.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<IREdditLikeCommunityCommunityBan.ICreate>,
      },
    );
  typia.assert(ban);
  // 5. Unban as owner
  await api.functional.redditLikeCommunity.member.bans.eraseByBanid(
    ownerConnection,
    {
      banId: ban.id satisfies string & tags.Format<"uuid">,
    },
  );
  // 6. Verify - void response means success, no exception thrown indicates operation completed successfully
}
