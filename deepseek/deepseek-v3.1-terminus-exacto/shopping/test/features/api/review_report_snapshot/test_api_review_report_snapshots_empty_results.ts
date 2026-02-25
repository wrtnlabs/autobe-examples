import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test empty result scenarios for review report snapshots search.
 * Validates that the API gracefully handles search criteria that produce no matches,
 * returning proper pagination metadata with zero records and pages.
 */
export async function test_api_review_report_snapshots_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Test 1: Future date range - no records should exist
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString(); // 10 years in future
  const futureRangeResult =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_created_at_start: futureDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "future date zero records",
    futureRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date zero pages",
    futureRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date correct limit",
    futureRangeResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "future date empty data array",
    futureRangeResult.data.length,
    0,
  );
  // Test 2: Non-existent UUID filters
  const nonExistentUuidResult =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      adminConnection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>() satisfies
            | string
            | null
            | undefined as string | null | undefined,
          customer_id: typia.random<string & tags.Format<"uuid">>() satisfies
            | string
            | null
            | undefined as string | null | undefined,
          review_id: typia.random<string & tags.Format<"uuid">>() satisfies
            | string
            | null
            | undefined as string | null | undefined,
          page: 1,
          limit: 5,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentUuidResult);
  TestValidator.equals(
    "non-existent UUID zero records",
    nonExistentUuidResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent UUID zero pages",
    nonExistentUuidResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent UUID correct limit",
    nonExistentUuidResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "non-existent UUID empty data array",
    nonExistentUuidResult.data.length,
    0,
  );
  // Test 3: Non-matching text patterns
  const nonMatchingTextResult =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      adminConnection,
      {
        body: {
          report_category: "NONEXISTENT_CATEGORY_PATTERN_XYZ123",
          report_reason: "THIS_PATTERN_DOES_NOT_EXIST_ANYWHERE_IN_DATABASE",
          search: "XYZ_NONEXISTENT_PATTERN_123",
          page: 1,
          limit: 20,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(nonMatchingTextResult);
  TestValidator.equals(
    "non-matching text zero records",
    nonMatchingTextResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching text zero pages",
    nonMatchingTextResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-matching text correct limit",
    nonMatchingTextResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "non-matching text empty data array",
    nonMatchingTextResult.data.length,
    0,
  );
  // Test 4: Contradictory date filters
  const contradictoryDateResult =
    await api.functional.ecommerce.administrator.review_report_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_created_at_start: futureDate,
          snapshot_created_at_end: new Date(
            Date.now() - 1000 * 60 * 60 * 24,
          ).toISOString(), // Past date
          page: 1,
          limit: 15,
        } satisfies IEcommerceReviewReportSnapshot.IRequest,
      },
    );
  typia.assert(contradictoryDateResult);
  TestValidator.equals(
    "contradictory dates zero records",
    contradictoryDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "contradictory dates zero pages",
    contradictoryDateResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "contradictory dates correct limit",
    contradictoryDateResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "contradictory dates empty data array",
    contradictoryDateResult.data.length,
    0,
  );
}
