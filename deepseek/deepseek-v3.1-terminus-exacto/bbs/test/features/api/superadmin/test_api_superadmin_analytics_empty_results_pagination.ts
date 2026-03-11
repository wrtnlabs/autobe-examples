import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Execute analytics query with restrictive filters that should return empty results
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.administrations.analytics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "cpu_utilization",
          source_service: "unused_service",
          status: "critical",
          start_timestamp: new Date("2030-01-01T00:00:00.000Z").toISOString(),
          end_timestamp: new Date("2030-01-02T00:00:00.000Z").toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    analyticsResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    analyticsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    analyticsResponse.pagination.pages,
    0,
  );
  // Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    analyticsResponse.data.length,
    0,
  );
}
