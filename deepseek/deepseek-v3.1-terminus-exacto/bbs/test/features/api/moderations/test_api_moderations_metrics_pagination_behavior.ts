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

/**
 * Test pagination behavior when retrieving system health metrics.
 * 1. Authenticate as super administrator
 * 2. Call metrics endpoint which returns paginated results
 * 3. Validate pagination metadata structure
 * 4. Verify data integrity
 */
export async function test_api_moderations_metrics_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Call metrics endpoint (no pagination parameters supported)
  const metricsPage =
    await api.functional.discussionBoard.superAdmin.moderations.metrics.at(
      superAdminConnection,
    );
  typia.assert(metricsPage);
  // 3. Validate pagination metadata calculations
  TestValidator.equals(
    "total pages calculation",
    metricsPage.pagination.pages,
    Math.ceil(metricsPage.pagination.records / metricsPage.pagination.limit),
  );
  // 4. Validate data array size matches pagination expectations
  if (metricsPage.pagination.current < metricsPage.pagination.pages) {
    TestValidator.equals(
      "data array size matches limit on non-last page",
      metricsPage.data.length,
      metricsPage.pagination.limit,
    );
  } else {
    TestValidator.predicate(
      "data array size valid on last page",
      metricsPage.data.length <= metricsPage.pagination.limit,
    );
  }
  // 5. Validate data integrity (typia.assert already validated everything)
  if (metricsPage.data.length > 1) {
    // Validate sorting by collection_timestamp descending
    for (let i = 0; i < metricsPage.data.length - 1; i++) {
      const currentTimestamp = new Date(
        metricsPage.data[i].collection_timestamp,
      ).getTime();
      const nextTimestamp = new Date(
        metricsPage.data[i + 1].collection_timestamp,
      ).getTime();
      TestValidator.predicate(
        "metrics sorted by collection_timestamp descending",
        currentTimestamp >= nextTimestamp,
      );
    }
  }
}
