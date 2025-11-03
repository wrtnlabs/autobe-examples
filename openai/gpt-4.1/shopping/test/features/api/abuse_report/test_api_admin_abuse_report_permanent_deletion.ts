import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Verifies permanent deletion of an abuse report for a product review by an
 * admin.
 *
 * 1. Registers a new admin account, confirming that administrative privileges are
 *    active and a valid admin JWT is issued.
 * 2. (Mocked in this test scope) Prepares random UUIDs for reviewId and
 *    abuseReportId to simulate a review and its abuse report. Real creation
 *    flows are skipped due to missing API coverage for those resources in the
 *    provided SDK. In a full system, these resources would be created up
 *    front.
 * 3. As an authenticated admin, calls the DELETE
 *    /shopping/admin/reviews/{reviewId}/abuseReports/{abuseReportId} endpoint
 *    to permanently delete the abuse report. Confirms request succeeds without
 *    error (void response).
 * 4. Immediately attempts the delete call again using the same IDs, asserting that
 *    a proper error (not found/forbidden) is thrown, indicating the report was
 *    indeed deleted in the first operation.
 * 5. Tries deletion with totally invalid random UUIDs to assert not
 *    found/forbidden errors are thrown for non-existent resources.
 * 6. There is no visible retrieval API for confirming deletion of abuse reports,
 *    so further validation of system state or audit records is out of scope for
 *    this test due to API limitations.
 */
export async function test_api_admin_abuse_report_permanent_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new admin and verify privileges
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);
  TestValidator.equals("registered admin email", admin.email, adminInput.email);
  TestValidator.equals("admin account status active", admin.status, "active");
  TestValidator.equals("admin privilege correct", admin.role, adminInput.role);
  TestValidator.predicate(
    "admin has authorization token",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Prepare random UUIDs for reviewId and abuseReportId
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const abuseReportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Delete the abuse report (assumes IDs exist in real system/context)
  await api.functional.shopping.admin.reviews.abuseReports.erase(connection, {
    reviewId,
    abuseReportId,
  });

  // 4. Try to delete again to confirm proper error is thrown for non-existence
  await TestValidator.error(
    "second delete with same IDs should fail",
    async () => {
      await api.functional.shopping.admin.reviews.abuseReports.erase(
        connection,
        {
          reviewId,
          abuseReportId,
        },
      );
    },
  );

  // 5. Attempt deletion using totally unrelated random UUIDs
  await TestValidator.error(
    "delete with unrelated random IDs should fail",
    async () => {
      await api.functional.shopping.admin.reviews.abuseReports.erase(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          abuseReportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. No API to verify audit log or fetch deleted report, so test ends here
}
