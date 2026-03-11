import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformModeratorDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorDashboardSummary";
import type { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import type { IRedditPlatformPendingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPendingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_dashboard_no_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>() ?? null,
      referrer: typia.random<string & tags.Format<"uri">>() ?? null,
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Authenticate admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const authenticatedAdmin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  typia.assert(authenticatedAdmin);
  // 3. Call dashboard endpoint
  const dashboardConnection: api.IConnection = { host: connection.host };
  const dashboardResponse =
    await api.functional.redditPlatform.admin.dashboard.at(dashboardConnection);
  typia.assert(dashboardResponse);
  // 4. Validate summary statistics
  const summary = dashboardResponse.summary;
  typia.assert(summary);
  TestValidator.equals("pending_count is zero", summary.pending_count, 0);
  TestValidator.equals("resolved_count is zero", summary.resolved_count, 0);
  TestValidator.equals("dismissed_count is zero", summary.dismissed_count, 0);
  TestValidator.equals(
    "communities_count is zero",
    summary.communities_count,
    0,
  );
  TestValidator.equals("reports_over_24h is zero", summary.reports_over_24h, 0);
  // 5. Validate reports array is empty
  const reports = dashboardResponse.reports;
  typia.assert(reports);
  TestValidator.equals("reports array is empty", reports.length, 0);
  // 6. Validate pagination metadata
  const pagination = dashboardResponse.pagination;
  typia.assert(pagination);
  TestValidator.equals("page is 1", pagination.page, 1);
  TestValidator.equals("limit is default", pagination.limit, 20);
  TestValidator.equals("total is zero", pagination.total, 0);
  TestValidator.equals("totalPages is 1", pagination.totalPages, 1);
  TestValidator.equals("hasNext is false", pagination.hasNext, false);
  TestValidator.equals("hasPrevious is false", pagination.hasPrevious, false);
}