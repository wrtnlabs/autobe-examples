import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewReport";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_get_single_review_report_detail(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) to get admin account and token
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphabets(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorizedOnJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedOnJoin);

  // 2. Register a customer (join) to get customer account and token
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphabets(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedOnJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedOnJoin);

  // 3. Re-login as platform admin to ensure we can later switch back cleanly
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedOnLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedOnLogin);

  // For this particular test we do not need to keep admin context between
  // steps; we'll switch to customer for review creation, then back to admin
  // right before fetching the report.

  // 4. Switch to customer context via login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedOnLogin);

  // 5. Customer creates a product review.
  // The IShoppingMallProductReview.ICreate DTO here contains rating, title, body.
  const reviewCreateBody = {
    rating: 5,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IShoppingMallProductReview.ICreate;

  const createdReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: reviewCreateBody,
    });
  typia.assert(createdReview);

  // 6. Customer submits a review report against the created review.
  const reportCreateBody = {
    reason_code: "spam",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    metadata: {},
  } satisfies IShoppingMallProductReviewReport.ICreate;

  const createdReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.customer.reviews.reports.create(
      connection,
      {
        reviewId: createdReview.id,
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // Basic invariants on created report
  TestValidator.equals(
    "created report must reference the review it was created for",
    createdReport.reviewId,
    createdReview.id,
  );
  TestValidator.equals(
    "created report reasonCode matches request payload",
    createdReport.reasonCode,
    reportCreateBody.reason_code,
  );
  TestValidator.equals(
    "created report description matches request payload",
    createdReport.description ?? null,
    reportCreateBody.description ?? null,
  );

  // 7. Switch context back to platform admin to retrieve the report detail via admin API.
  const platformAdminAuthorizedForFetch: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedForFetch);

  // 8. Platform admin fetches the single review report detail
  const fetchedReport: IShoppingMallProductReviewReport =
    await api.functional.shoppingMall.platformAdmin.reviews.reports.at(
      connection,
      {
        reviewId: createdReview.id,
        reportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // 9. Validate key fields on fetched report
  TestValidator.equals(
    "fetched report id matches requested reportId",
    fetchedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "fetched report reviewId matches requested reviewId",
    fetchedReport.reviewId,
    createdReview.id,
  );
  TestValidator.equals(
    "fetched report reasonCode equals original reason_code",
    fetchedReport.reasonCode,
    reportCreateBody.reason_code,
  );
  TestValidator.equals(
    "fetched report description equals original description (nullable)",
    fetchedReport.description ?? null,
    reportCreateBody.description ?? null,
  );

  // Reporter fields are opaque to the client; we can at least assert that the
  // reporterType is a non-empty string and reporterId is a UUID, relying on
  // typia.assert to guarantee shapes. This is already enforced by the type
  // assertion above, so here we focus on business invariants related to review
  // linkage.

  // 10. If the embedded review summary is present, validate linkage.
  if (fetchedReport.review !== undefined) {
    const embeddedReviewSummary = fetchedReport.review;
    // Ensure the summary references the same review id
    TestValidator.equals(
      "embedded review summary review_id matches created review id",
      embeddedReviewSummary.review_id,
      createdReview.id,
    );
  }
}
