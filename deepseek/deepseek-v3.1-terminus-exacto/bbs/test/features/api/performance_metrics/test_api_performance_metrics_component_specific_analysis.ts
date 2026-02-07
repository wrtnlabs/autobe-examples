import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metrics_component_specific_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection using the correct utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use the available authorize_super_admin_join utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: "test-super-admin@example.com",
      password: "test-password-123",
      privilege_level: "super_admin",
    },
  });
  // Test performance metrics retrieval with valid filtering criteria
  // Based on the actual IDiscussionBoardPerformanceMetric.IRequest DTO structure
  const requestBody: IDiscussionBoardPerformanceMetric.IRequest = {
    // Use only properties that exist in the DTO definition
    registration_date_start: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    registration_date_end: new Date().toISOString(),
    min_articles: 1,
    min_comments: 1,
    sort_by: "article_count",
    sort_order: "desc",
    page: 1,
    limit: 10,
  };
  const performanceMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(performanceMetrics);
  // The response should be a valid IPageIDiscussionBoardPerformanceMetric.ISummary
  // which contains pagination and data array
}
