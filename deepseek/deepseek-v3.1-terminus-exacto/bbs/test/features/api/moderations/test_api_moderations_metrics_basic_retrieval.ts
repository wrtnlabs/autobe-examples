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

export async function test_api_moderations_metrics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join operation
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Retrieve system health metrics
  const metrics =
    await api.functional.discussionBoard.superAdmin.moderations.metrics.at(
      superAdminConnection,
    );
  typia.assert(metrics);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid structure",
    metrics.pagination.current >= 0 &&
      metrics.pagination.limit >= 0 &&
      metrics.pagination.records >= 0 &&
      metrics.pagination.pages >= 0,
  );
  // Validate that data array exists (business logic validation)
  TestValidator.predicate(
    "metrics data array exists",
    metrics.data.length >= 0,
  );
  // Verify metrics are sorted by collection_timestamp descending (business logic)
  if (metrics.data.length > 1) {
    for (let i = 1; i < metrics.data.length; i++) {
      const currentTimestamp = new Date(metrics.data[i].collection_timestamp);
      const previousTimestamp = new Date(
        metrics.data[i - 1].collection_timestamp,
      );
      TestValidator.predicate(
        `metric ${i} timestamp <= metric ${i - 1} timestamp (latest first)`,
        currentTimestamp <= previousTimestamp,
      );
    }
  }
}
