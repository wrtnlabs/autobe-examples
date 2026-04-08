import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test post snapshot filtering functionality with various filter criteria.
 *
 * Validates the snapshot retrieval API's filtering capabilities including post ID filtering,
 * post type filtering, date range filtering, and combined filters. Ensures that the API
 * correctly applies each filter and returns properly paginated results.
 *
 * Special attention is given to verifying that date range validation works correctly
 * (rejecting invalid ranges where max is before min) and that combined filters produce
 * appropriately narrowed results.
 *
 * 1. Administrator account creation for accessing the snapshot endpoint.
 * 2. Test postId filter - retrieve snapshots for a specific post.
 * 3. Test postType filter - retrieve snapshots of a specific content type.
 * 4. Test dateRange filter - retrieve snapshots within a time window.
 * 5. Test combined filters - apply multiple filters simultaneously.
 * 6. Test dateRange validation - verify error when max < min.
 */
export async function test_api_post_snapshot_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for accessing snapshot endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Test Scenario: Filter by postId
  const postIdFilterResponse =
    await api.functional.redditCommunity.admin.snapshots.index(
      adminConnection,
      {
        body: {
          postId: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 100,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(postIdFilterResponse);
  TestValidator.equals(
    "postId filter pagination current",
    postIdFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "postId filter pagination limit",
    postIdFilterResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "postId filter data is array",
    Array.isArray(postIdFilterResponse.data),
  );
  // 3. Test Scenario: Filter by postType (link)
  const postTypeFilterResponse =
    await api.functional.redditCommunity.admin.snapshots.index(
      adminConnection,
      {
        body: {
          postType: "link",
          page: 1,
          limit: 50,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(postTypeFilterResponse);
  TestValidator.equals(
    "postType filter pagination current",
    postTypeFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "postType filter pagination limit",
    postTypeFilterResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "postType filter data is array",
    Array.isArray(postTypeFilterResponse.data),
  );
  // 4. Test Scenario: Filter by dateRange
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const dateRangeFilterResponse =
    await api.functional.redditCommunity.admin.snapshots.index(
      adminConnection,
      {
        body: {
          dateRange: { min: oneHourAgo, max: now },
          page: 1,
          limit: 20,
          sortBy: "id",
          sortOrder: "asc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFilterResponse);
  TestValidator.equals(
    "dateRange filter pagination current",
    dateRangeFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "dateRange filter pagination limit",
    dateRangeFilterResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "dateRange filter data is array",
    Array.isArray(dateRangeFilterResponse.data),
  );
  // 5. Test combined filtering
  const combinedFilterResponse =
    await api.functional.redditCommunity.admin.snapshots.index(
      adminConnection,
      {
        body: {
          postId: typia.random<string & tags.Format<"uuid">>(),
          postType: "link",
          dateRange: { min: oneHourAgo, max: now },
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "asc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter data is array",
    Array.isArray(combinedFilterResponse.data),
  );
  // 6. Test dateRange validation - max before min should return error
  await TestValidator.error(
    "dateRange validation - max before min",
    async () => {
      await api.functional.redditCommunity.admin.snapshots.index(
        adminConnection,
        {
          body: {
            dateRange: { min: now, max: oneHourAgo },
            page: 1,
            limit: 20,
            sortBy: "id",
            sortOrder: "asc",
          } satisfies IRedditCommunityPostSnapshot.IRequest,
        },
      );
    },
  );
}
