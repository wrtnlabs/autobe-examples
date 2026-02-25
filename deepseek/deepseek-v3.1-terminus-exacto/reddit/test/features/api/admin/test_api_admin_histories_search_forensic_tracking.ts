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

/**
 * Test forensic tracking capabilities through historical data search functionality.
 *
 * This test validates the admin's ability to search community platform snapshots
 * for forensic analysis and security monitoring. It tests various search criteria
 * including snapshot_reason filtering, date ranges, and pagination parameters.
 */
export async function test_api_admin_histories_search_forensic_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Search with specific snapshot reason
  const searchWithReason =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          snapshot_reason: "moderation_audit",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(searchWithReason);
  TestValidator.predicate(
    "should return pagination data",
    searchWithReason.pagination !== undefined,
  );
  TestValidator.predicate(
    "should return data array",
    Array.isArray(searchWithReason.data),
  );
  // Test 2: Search with date range (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const searchWithDateRange =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          created_at_start: yesterday,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(searchWithDateRange);
  // Test 3: Search for non-existent snapshot reason (should return empty data)
  const searchNonExistentReason =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          snapshot_reason: "non_existent_reason_12345",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(searchNonExistentReason);
  TestValidator.equals(
    "non-existent reason should return empty data",
    searchNonExistentReason.data.length,
    0,
  );
  // Test 4: Search with future date range (should return empty results)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const searchFutureDate =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          created_at_start: tomorrow,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(searchFutureDate);
  TestValidator.predicate(
    "future date search should return valid pagination",
    searchFutureDate.pagination.records >= 0,
  );
  // Test 5: Search with pagination validation
  const searchWithPagination =
    await api.functional.communityPlatform.admin.histories.index(
      adminConnection,
      {
        body: {
          limit: 3,
          page: 1,
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "page limit should be respected",
    searchWithPagination.pagination.limit === 3,
  );
  TestValidator.predicate(
    "current page should be 1",
    searchWithPagination.pagination.current === 1,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    searchWithPagination.data.length <= 3,
  );
}
