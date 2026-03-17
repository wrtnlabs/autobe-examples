import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_ban_historical_record_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test historical ban record access for audit purposes.
   *
   * This test validates that moderators can retrieve historical ban records
   * (bans that have been lifted) to maintain comprehensive audit trails.
   */
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  // 2. Create a second member that will be banned then unbanned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  // 3. Create a community (moderator becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  // 4. Create a ban record for the second member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: bannedMember.id,
          reason: banReason,
        } satisfies ICommunityPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // Verify initial ban is active (deleted_at should be null)
  TestValidator.equals("initial ban deleted_at is null", ban.deleted_at, null);
  // 5. Unban the user (soft-delete the ban record)
  await api.functional.communityPlatform.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Retrieve the historical ban record
  const historicalBan =
    await api.functional.communityPlatform.member.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(historicalBan);
  // 7. Validate historical ban record properties
  TestValidator.equals("ban id matches", historicalBan.id, ban.id);
  TestValidator.equals("reason preserved", historicalBan.reason, banReason);
  TestValidator.equals(
    "created_at preserved",
    historicalBan.created_at,
    ban.created_at,
  );
  // Most importantly: deleted_at should NOT be null (ban has been lifted)
  TestValidator.predicate(
    "deleted_at is not null (historical record)",
    historicalBan.deleted_at !== null,
  );
  // Validate member and moderator details are preserved
  TestValidator.equals(
    "banned member id preserved",
    historicalBan.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "moderator id preserved",
    historicalBan.moderator.member.id,
    moderator.id,
  );
  TestValidator.equals(
    "community id preserved",
    historicalBan.community.id,
    community.id,
  );
}
