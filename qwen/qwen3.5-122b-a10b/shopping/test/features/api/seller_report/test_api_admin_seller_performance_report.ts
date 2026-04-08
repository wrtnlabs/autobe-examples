import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReport";
import type { IEcommerceReportGroupedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReportGroupedResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin seller performance report generation with seller grouping.
 *
 * Validates the admin-only seller performance reporting endpoint that generates aggregated seller metrics grouped by seller dimension. The test ensures authenticated administrators can successfully generate reports containing seller product counts, order counts, and fulfillment rates.
 *
 * The report generation validates proper aggregation of seller performance data across the platform, with results grouped by individual seller UUIDs. Each grouped result contains the seller identifier and their associated performance metrics.
 *
 * 1. Authenticate as administrator using join endpoint.
 * 2. Generate seller performance report with seller grouping dimension.
 * 3. Validate report structure includes report_type as "seller".
 * 4. Validate metrics object contains total_sellers count.
 * 5. Validate grouped_results array contains seller-specific metrics.
 * 6. Each grouped result must have dimension as seller UUID.
 * 7. Each grouped result must have seller_product_count, seller_order_count, seller_fulfillment_rate metrics.
 */
export async function test_api_admin_seller_performance_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate seller performance report with seller grouping
  const report: IEcommerceReport =
    await api.functional.ecommerce.admin.reports.generate(adminConnection, {
      body: {
        reportType: "seller",
        grouping: "seller",
      } satisfies IEcommerceReport.IRequest,
    });
  typia.assert(report);
  // 3. Validate report type
  TestValidator.equals("report type is seller", report.report_type, "seller");
  // 4. Validate metrics contain total_sellers
  TestValidator.predicate(
    "metrics have total_sellers",
    report.metrics.total_sellers !== undefined,
  );
  // 5. Validate grouped_results exists
  TestValidator.predicate(
    "grouped_results exists",
    report.grouped_results !== undefined,
  );
  // 6. Validate each grouped result structure
  if (report.grouped_results && report.grouped_results.length > 0) {
    for (const result of report.grouped_results) {
      // Validate dimension is seller UUID
      TestValidator.predicate(
        "dimension is valid UUID",
        result.dimension !== null &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            result.dimension,
          ),
      );
      // Validate seller metrics exist
      TestValidator.predicate(
        "has seller_product_count",
        result.metrics.seller_product_count !== undefined,
      );
      TestValidator.predicate(
        "has seller_order_count",
        result.metrics.seller_order_count !== undefined,
      );
      TestValidator.predicate(
        "has seller_fulfillment_rate",
        result.metrics.seller_fulfillment_rate !== undefined,
      );
    }
  }
  // 7. Validate generated_at timestamp
  TestValidator.predicate(
    "has valid generated_at timestamp",
    report.generated_at !== undefined &&
      !isNaN(Date.parse(report.generated_at)),
  );
}
