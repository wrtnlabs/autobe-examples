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

export async function test_api_moderations_metrics_filtered_by_type(
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
  // Call metrics endpoint (note: the API doesn't support query parameter filtering based on SDK definition)
  const metrics =
    await api.functional.discussionBoard.superAdmin.moderations.metrics.at(
      superAdminConnection,
    );
  typia.assert(metrics);
  // Validate pagination structure
  TestValidator.predicate("has pagination", metrics.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(metrics.data));
  // Test that all metrics have valid structure
  for (const metric of metrics.data) {
    TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(metric.id));
    TestValidator.predicate(
      "has metric_type",
      metric.metric_type !== undefined && metric.metric_type.length > 0,
    );
    TestValidator.predicate(
      "has numeric metric_value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate(
      "has unit",
      metric.unit !== undefined && metric.unit.length > 0,
    );
    TestValidator.predicate(
      "has source_service",
      metric.source_service !== undefined && metric.source_service.length > 0,
    );
    TestValidator.predicate(
      "has valid collection_timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.collection_timestamp),
    );
    TestValidator.predicate(
      "has status",
      metric.status !== undefined && metric.status.length > 0,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate("current page >= 0", metrics.pagination.current >= 0);
  TestValidator.predicate("limit >= 0", metrics.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", metrics.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", metrics.pagination.pages >= 0);
  // Test that pagination calculations are consistent
  if (metrics.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      metrics.pagination.records / metrics.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      metrics.pagination.pages,
      expectedPages,
    );
  }
}
