import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";

/**
 * Validates abuse report creation against a review by a customer.
 *
 * Steps:
 *
 * 1. Register a new customer (authenticating in process)
 * 2. Generate a reviewId (simulate existing review)
 * 3. Submit an abuse report with valid report_type and comment
 * 4. Validate the returned abuse report has correct references
 * 5. Attempt to submit a duplicate abuse report as same customer (expect error)
 *
 * All validation is business-logic only (no type or request/response contract
 * errors).
 */
export async function test_api_review_abuse_report_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://shop.example.com/register",
    referrer: "https://google.com",
    ip: null,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerBody,
  });
  typia.assert(customer);

  // 2. Generate reviewId for abuse report target (simulate)
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Submit a valid abuse report
  const reportBody = {
    report_type: RandomGenerator.pick(["spam", "off_topic"] as const),
    comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingReviewAbuseReport.ICreate;
  const report =
    await api.functional.shopping.customer.reviews.abuseReports.create(
      connection,
      {
        reviewId,
        body: reportBody,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report is for correct review",
    report.shopping_review_id,
    reviewId,
  );
  TestValidator.equals(
    "reporter id is correct",
    report.reporter_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "report type is correct",
    report.report_type,
    reportBody.report_type,
  );
  TestValidator.equals(
    "comment is correct",
    report.comment,
    reportBody.comment,
  );

  // 4. Attempt duplicate by same customer (should fail logically)
  await TestValidator.error("duplicate abuse report is rejected", async () => {
    await api.functional.shopping.customer.reviews.abuseReports.create(
      connection,
      {
        reviewId,
        body: reportBody,
      },
    );
  });
}
