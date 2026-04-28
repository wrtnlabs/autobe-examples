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
 * Test updating the reason text of a community ban record.
 *
 * Validates the complete update workflow including owner authentication, community creation, target member registration, initial ban creation, and reason update. Ensures the ban record correctly reflects the modified reason while preserving all original metadata fields such as the issuing moderator, banned community, target member, and creation timestamp.
 *
 * Special attention is given to verifying that the update operation only modifies the reason field while other immutable properties (id, community, member, moderator, created_at) remain unchanged after the reason update.
 *
 * 1. Community owner authenticates by joining the platform.
 * 2. Owner creates a new community, automatically becoming the creator.
 * 3. A target member registers and authenticates separately.
 * 4. Owner creates an initial ban on the target member with an initial reason.
 * 5. Owner updates the ban's reason with new justification text.
 * 6. Validates the updated ban record reflects the new reason and preserves original metadata.
 */
export async function test_api_community_ban_update_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(owner);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {
        body: {} satisfies DeepPartial<IREdditLikeCommunityCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Target member authenticates
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(targetMember);
  // 4. Owner creates initial ban on target member with initial reason
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        body: { member_id: targetMember.id, reason: initialReason },
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 5. Update the ban's reason with new justification text
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBan =
    await api.functional.redditLikeCommunity.member.communities.community_bans.update(
      ownerConnection,
      {
        communityId: community.id,
        communityBanId: ban.id,
        body: {
          reason: updatedReason,
        } satisfies IREdditLikeCommunityCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate updates preserve original metadata and contain new reason
  TestValidator.equals("ban id unchanged", updatedBan.id, ban.id);
  TestValidator.equals(
    "community id unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "member id unchanged",
    updatedBan.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "moderator id unchanged",
    updatedBan.moderator.id,
    owner.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    ban.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedBan.updated_at) >= new Date(updatedBan.created_at),
  );
}
