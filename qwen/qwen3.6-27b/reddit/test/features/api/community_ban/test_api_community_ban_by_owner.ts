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
import { generate_random_reddit_like_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test community owner banning a member from their community.
 *
 * Validates that a community owner can ban a target member, ensuring proper authority verification and relationship mapping. Verifies that the ban record correctly associates the banned member, the target community, the owner-as-moderator, and the ban reason.
 *
 * Ensures that the ban is immediately active (deleted_at is null), the owner's moderator authority is correctly attributed, and both the community and target member references are maintained accurately.
 *
 * 1. Register a target member who will be banned.
 * 2. Register and authenticate the community owner.
 * 3. Owner creates a community (automatically becomes owner/moderator).
 * 4. Owner bans the target member from their community with a reason.
 * 5. Validate ban record contains correct member, community, moderator, and reason.
 */
export async function test_api_community_ban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register target member (who will be banned)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuthorized = await authorize_member_join(
    targetMemberConnection,
    { body: {} },
  );
  typia.assert(targetMemberAuthorized);
  const targetMemberId: string & tags.Format<"uuid"> =
    targetMemberAuthorized.id;
  // 2. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(ownerAuthorized);
  const ownerId: string & tags.Format<"uuid"> = ownerAuthorized.id;
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Owner bans target member from their community
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_reddit_like_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          member_id: targetMemberId,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals(
    "banned member matches target",
    ban.member.id,
    targetMemberId,
  );
  TestValidator.equals(
    "community matches created community",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator is the owner",
    ban.moderator.member.id,
    ownerId,
  );
  TestValidator.equals("ban reason matches input", ban.reason, banReason);
  TestValidator.equals("ban is active (not deleted)", ban.deleted_at, null);
}
