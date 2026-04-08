import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBan";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test filtering community bans by status (active or removed).
 *
 * Validates the ban filtering functionality for community moderators and owners. Tests that the status filter correctly returns only bans matching the specified status value, and that pagination metadata accurately reflects the filtered results.
 *
 * The test verifies three filtering scenarios: active-only filter returns exclusively active bans, removed-only filter returns exclusively removed bans, and no filter returns all bans. Each scenario validates that the pagination records count matches the actual returned data length and that every ban's status field matches the filter criteria.
 *
 * 1. Member registers and authenticates as community owner.
 * 2. Community is created with the member as owner.
 * 3. Retrieve bans with status='active' filter and validate all returned bans have active status.
 * 4. Retrieve bans with status='removed' filter and validate all returned bans have removed status.
 * 5. Retrieve bans without status filter and validate it returns all bans.
 * 6. Validate pagination metadata (records, pages, current, limit) for each query.
 */
export async function test_api_community_ban_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Test active status filter
  const activeBans =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(activeBans);
  // Validate active bans
  TestValidator.predicate(
    "active bans pagination records",
    () => activeBans.pagination.records === activeBans.data.length,
  );
  activeBans.data.forEach((ban, index) => {
    TestValidator.equals(`active ban ${index} status`, ban.status, "active");
    typia.assert(ban);
  });
  // 4. Test removed status filter
  const removedBans =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          status: "removed",
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(removedBans);
  // Validate removed bans
  TestValidator.predicate(
    "removed bans pagination records",
    () => removedBans.pagination.records === removedBans.data.length,
  );
  removedBans.data.forEach((ban, index) => {
    TestValidator.equals(`removed ban ${index} status`, ban.status, "removed");
    typia.assert(ban);
  });
  // 5. Test without status filter (all bans)
  const allBans =
    await api.functional.redditCommunity.member.communities.bans.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBan.IRequest,
      },
    );
  typia.assert(allBans);
  // Validate all bans pagination
  TestValidator.predicate(
    "all bans pagination records",
    () => allBans.pagination.records === allBans.data.length,
  );
  // 6. Validate that all bans count equals active + removed
  TestValidator.equals(
    "total bans equals active plus removed",
    allBans.pagination.records,
    activeBans.pagination.records + removedBans.pagination.records,
  );
  // Validate each ban in allBans has valid status
  allBans.data.forEach((ban, index) => {
    TestValidator.predicate(
      `all ban ${index} has valid status`,
      () => ban.status === "active" || ban.status === "removed",
    );
    typia.assert(ban);
  });
}
