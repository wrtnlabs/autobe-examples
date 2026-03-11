import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior when retrieving system health metrics.
 * Verify that the metrics endpoint properly returns paginated data
 * with valid pagination metadata, consistent sorting, and correctly
 * calculated page boundaries.
 */
export async function test_api_admin_moderations_metrics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminConnection);
  // Get first page of metrics
  const page1 =
    await api.functional.discussionBoard.admin.moderations.metrics.at(
      adminConnection,
    );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    page1.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(page1.data));
  const pagination = page1.pagination;
  typia.assert(pagination);
  // Validate pagination fields
  TestValidator.predicate("current page >= 0", pagination.current >= 0);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // Validate data array length does not exceed limit (except possibly on last page)
  if (pagination.limit > 0) {
    TestValidator.predicate(
      "data length <= limit",
      page1.data.length <= pagination.limit,
    );
  }
  // Validate pagination calculations
  if (pagination.limit > 0 && pagination.records > 0) {
    const calculatedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages calculation matches records/limit",
      pagination.pages,
      calculatedPages,
    );
  } else {
    // When limit = 0 or records = 0, pages should be 0
    TestValidator.equals("pages should be 0 when no data", pagination.pages, 0);
  }
  // Validate each metric structure
  for (const metric of page1.data) {
    typia.assert(metric);
    TestValidator.predicate(
      "has metric_type",
      typeof metric.metric_type === "string",
    );
    TestValidator.predicate(
      "has metric_value",
      typeof metric.metric_value === "number",
    );
    TestValidator.predicate("has unit", typeof metric.unit === "string");
    TestValidator.predicate(
      "has source_service",
      typeof metric.source_service === "string",
    );
    TestValidator.predicate("has status", typeof metric.status === "string");
    TestValidator.predicate(
      "has valid collection timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(metric.collection_timestamp),
    );
  }
  // Test sorting by collection_timestamp descending
  if (page1.data.length > 1) {
    let prevTimestamp = new Date(page1.data[0].collection_timestamp).getTime();
    for (let i = 1; i < page1.data.length; i++) {
      const currTimestamp = new Date(
        page1.data[i].collection_timestamp,
      ).getTime();
      TestValidator.predicate(
        `metrics[${i}] should be older or equal to metrics[${i - 1}]`,
        currTimestamp <= prevTimestamp,
      );
      prevTimestamp = currTimestamp;
    }
  }
  // Call endpoint multiple times to ensure consistency
  const page2 =
    await api.functional.discussionBoard.admin.moderations.metrics.at(
      adminConnection,
    );
  typia.assert(page2);
  // Pagination metadata should be consistent across calls
  TestValidator.equals(
    "pagination consistency",
    pagination.current,
    page2.pagination.current,
  );
  TestValidator.equals(
    "limit consistency",
    pagination.limit,
    page2.pagination.limit,
  );
  TestValidator.equals(
    "records consistency",
    pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "pages consistency",
    pagination.pages,
    page2.pagination.pages,
  );
  // Test that we get the same data (since no pagination parameters)
  TestValidator.equals(
    "data should be identical across calls",
    page1.data.length,
    page2.data.length,
  );
  // Note: We can't test actual pagination navigation since the endpoint
  // doesn't accept page/limit parameters. This test validates that
  // the pagination structure exists and follows proper conventions.
}
