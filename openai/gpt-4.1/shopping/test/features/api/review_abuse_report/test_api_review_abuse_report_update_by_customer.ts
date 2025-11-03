import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";

/**
 * Validate updating an existing abuse report for a product review by the
 * reporting customer.
 *
 * This test covers the process of registering a customer, creating an abuse
 * report for a review, updating the report while it remains editable, and
 * verifying enforcement of business rules including audit trail, no-op updates,
 * and failed updates by unauthorized or unauthenticated users.
 *
 * Steps:
 *
 * 1. Register a customer account
 * 2. Simulate a random review (as the review entity itself is not in scope)
 * 3. Customer creates an abuse report for the simulated review
 * 4. Update the report with new values for report_type and comment (while still
 *    editable)
 * 5. Verify the report was updated and audit fields changed accordingly
 * 6. Attempt update with an empty input (should result in a no-op)
 * 7. Simulate failure to update after the report would be non-editable (i.e., by
 *    business logic, backend will deny update)
 * 8. Attempt update with an unauthenticated connection (should be rejected)
 */
export async function test_api_review_abuse_report_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://testhost/customer-join",
    referrer: "https://testhost/landing",
    ip: undefined,
  } satisfies IShoppingCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);

  // 2. Simulate a review (random UUID)
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Customer creates an abuse report for the review
  const initialReportInput = {
    report_type: "spam",
    comment: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingReviewAbuseReport.ICreate;
  const report =
    await api.functional.shopping.customer.reviews.abuseReports.create(
      connection,
      {
        reviewId,
        body: initialReportInput,
      },
    );
  typia.assert(report);

  // 4. Update the report (while still editable)
  const updateInput = {
    report_type: "hate_speech",
    comment: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingReviewAbuseReport.IUpdate;
  const updated =
    await api.functional.shopping.customer.reviews.abuseReports.update(
      connection,
      {
        reviewId,
        abuseReportId: report.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "abuse report should be updated",
    updated,
    report,
    (key) => key === "updated_at",
  );
  TestValidator.equals(
    "updated report_type",
    updated.report_type,
    updateInput.report_type,
  );
  TestValidator.equals("updated comment", updated.comment, updateInput.comment);

  // 5. Attempt update with empty input (should be a no-op)
  const noOpUpdate: IShoppingReviewAbuseReport.IUpdate = {};
  const resultNoOp =
    await api.functional.shopping.customer.reviews.abuseReports.update(
      connection,
      {
        reviewId,
        abuseReportId: report.id,
        body: noOpUpdate,
      },
    );
  typia.assert(resultNoOp);
  TestValidator.equals(
    "no-op update should not change id",
    resultNoOp.id,
    report.id,
  );
  TestValidator.equals(
    "no-op update preserves state",
    resultNoOp.state,
    updated.state,
  );

  // 6. Simulate non-editable report cannot be updated (business logic enforced by backend)
  await TestValidator.error(
    "update on processed report is rejected",
    async () => {
      await api.functional.shopping.customer.reviews.abuseReports.update(
        connection,
        {
          reviewId,
          abuseReportId: report.id,
          body: { report_type: "off_topic" },
        },
      );
    },
  );

  // 7. Simulate unauthenticated connection cannot update abuse report
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update abuse report",
    async () => {
      await api.functional.shopping.customer.reviews.abuseReports.update(
        unauthConn,
        {
          reviewId,
          abuseReportId: report.id,
          body: { report_type: "spam" },
        },
      );
    },
  );
}
