import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_snapshot_admin_filtered_by_date_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Note: Since we don't have a snapshot creation endpoint available,
  // we'll test the filtering functionality with the assumption that
  // the system may have existing snapshots or the endpoint handles
  // empty results gracefully
  // Test 1: Filter by date range
  const dateFilterResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          created_at_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days ago
          created_at_end: new Date().toISOString(), // current time
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Validate pagination structure for date filter
  TestValidator.predicate(
    "date filter returns valid pagination",
    dateFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "date filter returns data array",
    Array.isArray(dateFilterResponse.data),
  );
  TestValidator.equals(
    "pagination has current page",
    dateFilterResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    dateFilterResponse.pagination.limit > 0,
  );
  // Test 2: Filter by snapshot reason
  const reasonFilterResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          snapshot_reason: "moderation_audit",
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(reasonFilterResponse);
  // Validate pagination structure for reason filter
  TestValidator.predicate(
    "reason filter returns valid pagination",
    reasonFilterResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "reason filter returns data array",
    Array.isArray(reasonFilterResponse.data),
  );
  // Test 3: Combined date and reason filtering
  const combinedFilterResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          snapshot_reason: "owner_change",
          created_at_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          created_at_end: new Date().toISOString(),
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Test 4: Pagination with filters
  const paginationResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {
          snapshot_reason: "scheduled_backup",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination parameters
  TestValidator.equals(
    "pagination page is set correctly",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set correctly",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is non-negative",
    paginationResponse.pagination.pages >= 0,
  );
  // Test 5: Empty filter (should return all snapshots)
  const emptyFilterResponse =
    await api.functional.communityPlatform.admin.communities.snapshots.index(
      adminConnection,
      {
        communityId,
        body: {} satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  // Validate that empty filter returns valid structure
  TestValidator.predicate(
    "empty filter returns valid response",
    emptyFilterResponse.pagination !== undefined &&
      Array.isArray(emptyFilterResponse.data),
  );
}
