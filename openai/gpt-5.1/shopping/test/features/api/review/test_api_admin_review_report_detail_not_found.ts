import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReport";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Validate that admin review report detail endpoint rejects non-existent report
 * ids.
 *
 * Business intent
 *
 * - Administrative and moderation tooling can open the details of a single review
 *   report by id using GET /shoppingMall/admin/reviewReports/{reportId}.
 * - When an admin passes a reportId that does not correspond to any row in
 *   shopping_mall_review_reports, the backend must fail with a not-found style
 *   error rather than returning a fabricated or empty
 *   IShoppingMallReviewReport.
 *
 * Scope of this e2e test
 *
 * - Exercise the happy-path authentication prerequisite by creating an admin
 *   account via POST /auth/admin/join, which also issues an access token and
 *   stores it into the SDK connection headers.
 * - Use a random UUID string for reportId to strongly reduce collision
 *   probability with any existing report rows.
 * - Call api.functional.shoppingMall.admin.reviewReports.at with that
 *   non-existent id and assert that it throws an HttpError wrapped by the SDK.
 * - Do NOT assert a specific HTTP status code or error payload structure, because
 *   global testing rules prohibit explicit status-code checks and type error
 *   style validation; instead, just verify that an error is thrown using
 *   TestValidator.error.
 */
export async function test_api_admin_review_report_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Arrange: register an admin to obtain an authenticated admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Act & Assert: calling reviewReports.at with a random UUID id should fail.
  const nonexistentReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "admin review report detail must error on non-existent id",
    async () => {
      await api.functional.shoppingMall.admin.reviewReports.at(connection, {
        reportId: nonexistentReportId,
      });
    },
  );
}
