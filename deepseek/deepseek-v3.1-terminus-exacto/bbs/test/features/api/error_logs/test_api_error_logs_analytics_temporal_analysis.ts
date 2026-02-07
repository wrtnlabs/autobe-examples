import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_logs_analytics_temporal_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test analytics with recent date range (last 7 days)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const analyticsRequest: IDiscussionBoardErrorLog.IAnalyticsRequest = {
    start_date: startDate,
    end_date: endDate,
    error_type: "validation_error",
    severity: "error",
    component: "api_gateway",
    environment: "production",
  };
  // Call analytics endpoint
  const analyticsResponse =
    await api.functional.discussionBoard.admin.error_logs.analytics.index(
      adminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    analyticsResponse.pagination.current >= 0 &&
      analyticsResponse.pagination.limit >= 0 &&
      analyticsResponse.pagination.records >= 0 &&
      analyticsResponse.pagination.pages >= 0,
  );
  // Test edge case: overlapping date range (same start and end)
  const overlappingRequest: IDiscussionBoardErrorLog.IAnalyticsRequest = {
    start_date: startDate,
    end_date: startDate,
    error_type: "system_error",
    severity: "critical",
    component: null,
    environment: "staging",
  };
  const overlappingResponse =
    await api.functional.discussionBoard.admin.error_logs.analytics.index(
      adminConnection,
      { body: overlappingRequest },
    );
  typia.assert(overlappingResponse);
}
