import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_log_admin_search_filter_source_component_date(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate test dates
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Test filtering by source_component='authentication' and date range (last 7 days)
  const authFilterRequest: ICommunityPlatformErrorLog.IRequest = {
    source_component: "authentication",
    occurred_at_start: sevenDaysAgo.toISOString(),
    occurred_at_end: now.toISOString(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const authFilterResponse =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      { body: authFilterRequest },
    );
  typia.assert(authFilterResponse);
  // Validate that all returned logs are from authentication component and within date range
  TestValidator.predicate(
    "all logs from authentication component",
    authFilterResponse.data.every(
      (log) => log.source_component === "authentication",
    ),
  );
  TestValidator.predicate(
    "all logs within date range",
    authFilterResponse.data.every((log) => {
      const occurredAt = new Date(log.occurred_at);
      return occurredAt >= sevenDaysAgo && occurredAt <= now;
    }),
  );
  // Test combination filter: source_component + resolution_status + date range
  const combinedFilterRequest: ICommunityPlatformErrorLog.IRequest = {
    source_component: "authentication",
    resolution_status: "open",
    occurred_at_start: sevenDaysAgo.toISOString(),
    occurred_at_end: now.toISOString(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  };
  const combinedFilterResponse =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filter results
  TestValidator.predicate(
    "all logs match combined filter criteria",
    combinedFilterResponse.data.every((log) => {
      const occurredAt = new Date(log.occurred_at);
      return (
        log.source_component === "authentication" &&
        log.resolution_status === "open" &&
        occurredAt >= sevenDaysAgo &&
        occurredAt <= now
      );
    }),
  );
  // Test pagination with filtered results
  const paginationRequest: ICommunityPlatformErrorLog.IRequest = {
    source_component: "authentication",
    occurred_at_start: sevenDaysAgo.toISOString(),
    occurred_at_end: now.toISOString(),
    page: 1,
    limit: 5,
  };
  const paginationResponse =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "page size matches limit",
    paginationResponse.data.length,
    5,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    paginationResponse.pagination.current === 1 &&
      paginationResponse.pagination.limit === 5 &&
      paginationResponse.pagination.records >= 0 &&
      paginationResponse.pagination.pages >= 0,
  );
  // Test that logs outside date range are excluded
  const oldDateFilterRequest: ICommunityPlatformErrorLog.IRequest = {
    source_component: "authentication",
    occurred_at_start: fourteenDaysAgo.toISOString(),
    occurred_at_end: sevenDaysAgo.toISOString(),
  };
  const oldDateFilterResponse =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      { body: oldDateFilterRequest },
    );
  typia.assert(oldDateFilterResponse);
  // Verify no authentication logs from recent period appear in old date range results
  TestValidator.predicate(
    "no recent logs in old date range results",
    oldDateFilterResponse.data.every((log) => {
      const occurredAt = new Date(log.occurred_at);
      return occurredAt < sevenDaysAgo;
    }),
  );
}
