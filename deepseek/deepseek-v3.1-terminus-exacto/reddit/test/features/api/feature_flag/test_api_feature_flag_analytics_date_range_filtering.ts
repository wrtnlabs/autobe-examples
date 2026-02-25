import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlagEnvironmentDetail";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeatureFlagEnvironmentDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlagEnvironmentDetail";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_feature_flag_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Get current time for date filtering
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Test 1: created_at_start filter (flags created after specific date)
  const startFilterDate = new Date(now.getTime() - 30 * oneDayMs).toISOString(); // 30 days ago
  const startFilterResult =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: startFilterDate,
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(startFilterResult);
  // Test 2: created_at_end filter (flags created before specific date)
  const endFilterDate = new Date(now.getTime() - 1 * oneDayMs).toISOString(); // 1 day ago
  const endFilterResult =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          created_at_end: endFilterDate,
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(endFilterResult);
  // Test 3: Combined start and end date filter
  const combinedStartDate = new Date(
    now.getTime() - 15 * oneDayMs,
  ).toISOString(); // 15 days ago
  const combinedEndDate = new Date(now.getTime() - 5 * oneDayMs).toISOString(); // 5 days ago
  const combinedResult =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: combinedStartDate,
          created_at_end: combinedEndDate,
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test 4: Edge case - date range with likely no results (future dates)
  const futureStartDate = new Date(now.getTime() + 1 * oneDayMs).toISOString(); // 1 day in future
  const futureEndDate = new Date(now.getTime() + 2 * oneDayMs).toISOString(); // 2 days in future
  const emptyResult =
    await api.functional.communityPlatform.admin.analytics.feature_flags.index(
      adminConnection,
      {
        body: {
          created_at_start: futureStartDate,
          created_at_end: futureEndDate,
          limit: 100,
        } satisfies ICommunityPlatformFeatureFlagEnvironmentDetail.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate that all responses have proper pagination structure
  TestValidator.equals(
    "start filter has pagination",
    typeof startFilterResult.pagination,
    "object",
  );
  TestValidator.equals(
    "end filter has pagination",
    typeof endFilterResult.pagination,
    "object",
  );
  TestValidator.equals(
    "combined filter has pagination",
    typeof combinedResult.pagination,
    "object",
  );
  TestValidator.equals(
    "empty result has pagination",
    typeof emptyResult.pagination,
    "object",
  );
  // Validate that data arrays exist
  TestValidator.predicate(
    "start filter data is array",
    Array.isArray(startFilterResult.data),
  );
  TestValidator.predicate(
    "end filter data is array",
    Array.isArray(endFilterResult.data),
  );
  TestValidator.predicate(
    "combined filter data is array",
    Array.isArray(combinedResult.data),
  );
  TestValidator.predicate(
    "empty result data is array",
    Array.isArray(emptyResult.data),
  );
  // Test that date filtering produces different result counts (if data exists)
  if (
    startFilterResult.pagination.records > 0 ||
    endFilterResult.pagination.records > 0
  ) {
    TestValidator.notEquals(
      "different date filters produce different record counts",
      startFilterResult.pagination.records,
      endFilterResult.pagination.records,
    );
  }
}
