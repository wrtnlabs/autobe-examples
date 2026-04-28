import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
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
 * Test retrieving a lifted community ban record with populated deleted_at timestamp.
 *
 * Validates the complete community ban soft-delete lifecycle: a moderator creates a community, bans another member with a reason text, lifts the ban via the erasure endpoint, and retrieves the lifted ban record to verify soft-delete semantics.
 *
 * Special attention is given to confirming that the `deleted_at` field transitions from null (active ban) to a valid ISO 8601 timestamp after the lift operation, while other fields like `reason`, `member`, `moderator`, and `community` remain preserved. The ban record persists in the system rather than being physically removed.
 *
 * 1. Moderator member registers and authenticates to the platform.
 * 2. Moderator creates a new community, becoming its owner and highest authority.
 * 3. A second member registers to serve as the ban target.
 * 4. Moderator issues a ban on the second member within the community with a reason.
 * 5. Moderator lifts (erases) the ban using the ban erasure endpoint.
 * 6. The lifted ban record is retrieved to verify soft-delete semantics.
 * 7. Validates that `deleted_at` is a non-null ISO 8601 timestamp after lift.
 * 8. Validates that `reason` text is preserved from original ban creation.
 * 9. Validates that all nested objects (community, member, moderator) are populated.
 */
export async function test_api_community_ban_retrieve_lifted_ban_with_deleted_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator (community owner) registers and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderator);
  // 2. Moderator creates a community (automatically becomes owner/moderator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Second member registers (will be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {},
  });
  typia.assert(bannedMember);
  // 4. Moderator bans the second member in the community
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorConnection,
      {
        body: {
          reason: banReason,
          member_id: bannedMember.id,
        },
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // Verify initial state: deleted_at should be null for active ban
  TestValidator.equals("active ban has null deleted_at", ban.deleted_at, null);
  // 5. Moderator lifts (erases) the ban
  const liftedBan =
    await api.functional.redditLikeCommunity.member.bans.putByBanid(
      moderatorConnection,
      {
        banId: ban.id,
      },
    );
  typia.assert(liftedBan);
  // Verify lift response has deleted_at populated
  TestValidator.predicate(
    "lifted ban has non-null deleted_at",
    liftedBan.deleted_at !== null,
  );
  // 6. Retrieve the lifted ban record via the bans endpoint
  const retrievedBan = await api.functional.redditLikeCommunity.bans.at(
    moderatorConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 7. Validate soft-delete semantics on retrieved ban
  TestValidator.predicate(
    "retrieved ban has non-null deleted_at timestamp",
    retrievedBan.deleted_at !== null,
  );
  // 8. Validate deleted_at is a valid ISO 8601 format string
  TestValidator.predicate(
    "deleted_at is non-empty string (ISO 8601 timestamp)",
    retrievedBan.deleted_at!.length > 0,
  );
  // 9. Validate reason text preserved from original ban
  TestValidator.equals(
    "reason preserved after lift",
    retrievedBan.reason,
    ban.reason,
  );
  // 10. Validate nested objects are correctly populated
  TestValidator.predicate(
    "community object is populated",
    retrievedBan.community.id !== undefined,
  );
  TestValidator.predicate(
    "member (banned) object is populated",
    retrievedBan.member.id !== undefined,
  );
  TestValidator.predicate(
    "moderator object is populated",
    retrievedBan.moderator.id !== undefined,
  );
}
