import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_ban_list_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a moderator by creating a community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  // Test 1: Basic ban list call with default parameters
  const basicResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(basicResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    basicResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    basicResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    basicResult.pagination.pages >= 0,
  );
  // Test 2: Search by banned member username (partial match)
  const searchResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { search: RandomGenerator.alphabets(5) },
      },
    );
  typia.assert(searchResult);
  // Test 3: Filter by reason text (contains search)
  const reasonResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { reason: RandomGenerator.alphabets(5) },
      },
    );
  typia.assert(reasonResult);
  // Test 4: Date range filter
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          from: weekAgo.toISOString(),
          to: now.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResult);
  // Test 5: Sort by created_at descending (default - newest first)
  const sortDescResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { sort: "created_at_desc" },
      },
    );
  typia.assert(sortDescResult);
  // Test 6: Sort by created_at ascending (oldest first)
  const sortAscResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { sort: "created_at_asc" },
      },
    );
  typia.assert(sortAscResult);
  // Test 7: Pagination - first page with custom limit
  const page1Result =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { page: 1, limit: 10 },
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  // Test 8: Pagination - second page
  const page2Result =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { page: 2, limit: 5 },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  // Test 9: Maximum limit constraint (100 records per page)
  const maxLimitResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit respected",
    maxLimitResult.pagination.limit <= 100,
  );
  // Test 10: Combined filters - search with date range and sort
  const combinedResult =
    await api.functional.communityPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          search: RandomGenerator.alphabets(3),
          reason: RandomGenerator.alphabets(3),
          from: weekAgo.toISOString(),
          to: now.toISOString(),
          sort: "created_at_desc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedResult);
  // Verify combined result structure
  TestValidator.equals(
    "combined page number",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined limit valid",
    combinedResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "combined records non-negative",
    combinedResult.pagination.records >= 0,
  );
  // Test 11: Verify data array structure when records exist
  if (basicResult.data.length > 0) {
    const banRecord = basicResult.data[0];
    TestValidator.predicate("ban has valid id", !!banRecord.id);
    TestValidator.predicate("ban has member info", !!banRecord.member);
    TestValidator.predicate(
      "ban has reason",
      typeof banRecord.reason === "string",
    );
    TestValidator.predicate("ban has created_at", !!banRecord.created_at);
    // Verify nested member structure
    TestValidator.predicate("member has id", !!banRecord.member.id);
    TestValidator.predicate(
      "member has username",
      typeof banRecord.member.username === "string",
    );
  }
}
