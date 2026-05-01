import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_bans_create } from "../../../generate/generate_random_community_hub_member_communities_bans_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_ban } from "../../../prepare/prepare_random_community_hub_community_ban";

/**
 * Test that a community owner can retrieve the ban list filtered to show only active bans.
 *
 * Validates that when a community owner filters the ban list by status "active", only currently active bans appear in the results — no lifted bans should be present. The response must include correct pagination metadata and each active ban record must contain the banned member's profile, the ban reason, the issuing moderator, and a null unbanned_at indicating active status.
 *
 * 1. First member authenticates and creates a community, becoming its owner.
 * 2. Second member authenticates as a separate user.
 * 3. The owner bans the second member from the community, creating an active ban record.
 * 4. The owner retrieves the ban list with status filter set to "active".
 * 5. Validates the response: active ban appears with correct banned member, null unbanned_at, null unbannedBy, and accurate pagination metadata — no lifted bans present.
 */
export async function test_api_community_ban_list_by_owner_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Second member authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 4. Owner bans the second member
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: member.username },
      },
    );
  // 5. Owner retrieves the ban list filtered by active status
  const result =
    await api.functional.communityHub.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: { status: "active" } satisfies ICommunityHubCommunityBan.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count >= 1",
    result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages count >= 1",
    result.pagination.pages >= 1,
  );
  // 7. Validate the active ban appears in results
  const foundBan = result.data.find((item) => item.id === ban.id);
  TestValidator.predicate(
    "active ban found in filtered results",
    foundBan !== undefined,
  );
  typia.assertGuard(foundBan!);
  TestValidator.equals(
    "banned member username matches",
    foundBan.bannedMember.username,
    member.username,
  );
  TestValidator.equals(
    "ban is active — unbanned_at is null",
    foundBan.unbanned_at,
    null,
  );
  TestValidator.equals(
    "unbannedBy is null for active ban",
    foundBan.unbannedBy,
    null,
  );
  TestValidator.equals(
    "issuing moderator is the community owner",
    foundBan.issuedBy.id,
    owner.id,
  );
  // 8. Verify no lifted bans leak into active-only filtered results
  const liftedBans = result.data.filter((item) => item.unbanned_at !== null);
  TestValidator.equals(
    "no lifted bans in active-only filter",
    liftedBans.length,
    0,
  );
}
