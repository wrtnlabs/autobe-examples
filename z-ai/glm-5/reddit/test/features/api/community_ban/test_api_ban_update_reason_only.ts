import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test updating ban reason while preserving expiration status.
 *
 * This test validates that when updating a ban record with only the reason field,
 * the expiration status (permanent/temporary) is preserved unchanged.
 *
 * Test Scenarios:
 * 1. Update reason on permanent ban - verify expiredAt remains null
 * 2. Clear reason by setting it to null
 * 3. Verify updatedAt timestamp reflects changes
 */
export async function test_api_ban_update_reason_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator/owner connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create community (moderator becomes owner)
  const community = await generate_random_community_member_communities_create(
    moderatorConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a user to be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser = await authorize_member_join(bannedUserConnection, {});
  typia.assert(bannedUser);
  // 4. Create a permanent ban with initial reason
  const initialReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await generate_random_community_member_communities_bans_create(
    moderatorConnection,
    {
      params: { communityName: community.name },
      body: {
        username: bannedUser.username,
        reason: initialReason,
        expired_at: null,
      },
    },
  );
  typia.assert(ban);
  // Verify initial ban state
  TestValidator.equals("initial reason", ban.reason, initialReason);
  TestValidator.equals("initial ban is permanent", ban.expiredAt, null);
  // 5. Test 1: Update reason only (expiredAt not provided)
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBan =
    await api.functional.community.member.communities.bans.update(
      moderatorConnection,
      {
        communityName: community.name,
        banId: ban.id,
        body: { reason: updatedReason } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Verify: reason updated, expiredAt preserved as null
  TestValidator.equals("reason updated", updatedBan.reason, updatedReason);
  TestValidator.equals(
    "permanent ban status preserved",
    updatedBan.expiredAt,
    null,
  );
  TestValidator.predicate(
    "updatedAt is recent",
    new Date(updatedBan.updatedAt).getTime() >=
      new Date(ban.updatedAt).getTime(),
  );
  // 6. Test 2: Clear reason by setting to null
  const clearedReasonBan =
    await api.functional.community.member.communities.bans.update(
      moderatorConnection,
      {
        communityName: community.name,
        banId: ban.id,
        body: { reason: null } satisfies ICommunityBan.IUpdate,
      },
    );
  typia.assert(clearedReasonBan);
  // Verify: reason cleared, expiredAt still null
  TestValidator.equals("reason cleared", clearedReasonBan.reason, null);
  TestValidator.equals(
    "permanent ban status still preserved",
    clearedReasonBan.expiredAt,
    null,
  );
}
