import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanRecord";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_list_community_filter_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password:
        "testpassword123" satisfies IRedditCommunityAdmin.IJoin["password"],
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create a community that has no bans (by generating a UUID)
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call ban records index with community_id filter
  const result = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate empty data array
  TestValidator.equals("data is empty array", result.data.length, 0);
  // 5. Validate pagination metadata with empty results
  const pagination = result.pagination;
  TestValidator.equals("current page defaults to 1", pagination.current, 1);
  TestValidator.equals(
    "limit matches request (default 20)",
    pagination.limit,
    20,
  );
  TestValidator.equals("records count is 0", pagination.records, 0);
  TestValidator.equals("pages count is 0", pagination.pages, 0);
  // 6. Test with ban_status filter (active) - should still be empty
  const resultActive = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
        ban_status: "active",
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(resultActive);
  TestValidator.equals(
    "active status filter returns empty",
    resultActive.data.length,
    0,
  );
  // 7. Test with ban_status filter (unbanned) - should still be empty
  const resultUnbanned = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
        ban_status: "unbanned",
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(resultUnbanned);
  TestValidator.equals(
    "unbanned status filter returns empty",
    resultUnbanned.data.length,
    0,
  );
  // 8. Test with order_by parameter on empty results
  const resultSorted = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
        order_by: "banned_at",
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(resultSorted);
  TestValidator.equals(
    "sorted query returns empty",
    resultSorted.data.length,
    0,
  );
  // 9. Test with pagination parameters on empty results
  const resultPaginated = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        community_id: nonExistentCommunityId,
        limit: 10,
        offset: 0,
        page: 1,
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(resultPaginated);
  TestValidator.equals(
    "paginated query returns empty",
    resultPaginated.data.length,
    0,
  );
  TestValidator.equals(
    "paginated query limit is 10",
    resultPaginated.pagination.limit,
    10,
  );
  // 10. Verify pagination object structure is complete even with empty data
  TestValidator.notEquals(
    "pagination current is not null",
    pagination.current,
    null,
  );
  TestValidator.notEquals(
    "pagination limit is not null",
    pagination.limit,
    null,
  );
  TestValidator.notEquals(
    "pagination records is not null",
    pagination.records,
    null,
  );
  TestValidator.notEquals(
    "pagination pages is not null",
    pagination.pages,
    null,
  );
}
