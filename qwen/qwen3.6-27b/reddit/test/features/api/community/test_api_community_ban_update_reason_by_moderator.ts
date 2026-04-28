import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
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
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that a community moderator can update the reason for an existing community ban.
 *
 * Validates the complete moderator ban update workflow including owner community creation, moderator role assignment, initial ban creation, and reason update by the deputy moderator. Ensures that the updated reason matches the provided justification while all structural metadata remains unchanged.
 *
 * 1. Owner member joins the platform and authenticates.
 * 2. Moderator candidate member joins and authenticates.
 * 3. Target member (to be banned) joins and authenticates.
 * 4. Owner creates a new community.
 * 5. Owner assigns the moderator candidate as MODERATOR in the community.
 * 6. Moderator issues a ban on the target member with an initial reason.
 * 7. Moderator updates the ban reason with a new justification text.
 * 8. Validates the new reason is persisted and all ban metadata remains intact.
 */
export async function test_api_community_ban_update_reason_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins the platform
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, { body: {} });
  typia.assert(owner);
  // 2. Moderator candidate joins
  const moderatorCandidateConnection: api.IConnection = {
    host: connection.host,
  };
  const moderatorMember = await authorize_member_join(
    moderatorCandidateConnection,
    {
      body: {},
    },
  );
  typia.assert(moderatorMember);
  // 3. Target member joins (the one to be banned)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {},
  });
  typia.assert(targetMember);
  // 4. Owner creates a community (automatically becomes owner)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 5. Owner assigns moderator candidate as MODERATOR in the community
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorMember.id,
          community_id: community.id,
        },
      },
    );
  typia.assert(moderatorAssignment);
  // 6. Moderator issues ban on target member with initial reason
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const initialBan =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorCandidateConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: targetMember.id,
          reason: initialReason,
        },
      },
    );
  typia.assert(initialBan);
  // 7. Moderator updates the ban reason with new justification
  const newReason = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    reason: newReason,
  } satisfies IREdditLikeCommunityCommunityBan.IUpdate;
  const updatedBan =
    await api.functional.redditLikeCommunity.member.communities.community_bans.update(
      moderatorCandidateConnection,
      {
        communityId: community.id,
        communityBanId: initialBan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 8. Validate new reason is persisted
  TestValidator.equals("ban reason updated", updatedBan.reason, newReason);
  // 9. Validate ban metadata remains intact
  TestValidator.equals(
    "banned member unchanged",
    updatedBan.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator unchanged",
    updatedBan.moderator.id,
    initialBan.moderator.id,
  );
  TestValidator.equals("ban ID preserved", updatedBan.id, initialBan.id);
  TestValidator.equals(
    "creation timestamp preserved",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedBan.updated_at !== updatedBan.created_at,
  );
  TestValidator.equals(
    "ban still active (not unbanned)",
    updatedBan.deleted_at,
    null,
  );
}
