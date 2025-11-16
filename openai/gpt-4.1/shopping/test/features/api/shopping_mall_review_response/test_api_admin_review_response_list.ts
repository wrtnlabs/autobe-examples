import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewResponse";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Tests that an authenticated admin can successfully retrieve a filtered and
 * paginated list of seller responses to a specific customer review.
 *
 * Steps:
 *
 * 1. Authenticate as an admin (via /auth/admin/join).
 * 2. Generate a random UUID to use as reviewId for the response list request.
 * 3. Construct a filter object with various combinations of inputs
 *    (moderation_status, date ranges, seller_id, etc.).
 * 4. Call the PATCH /shoppingMall/admin/reviews/{reviewId}/responses endpoint
 *    using the filter, and validate: a. Success response (paginated result set)
 *    for valid input. b. Response contains only data matching filter if data
 *    exists, or is empty if there is no data. c. Pagination meta section is
 *    returned and correct. d. No unauthorized or sensitive information leaks
 *    (e.g., only summary DTOs and allowed fields shown).
 * 5. Negative test: Call the endpoint with a random, likely-nonexistent reviewId
 *    and expect an empty or error response (depending on API behavior).
 * 6. Edge test: Use out-of-range page numbers or impossible moderation statuses to
 *    check error/empty handling.
 */
export async function test_api_admin_review_response_list(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Prepare a random reviewId (simulate - in production we would ensure review exists)
  const reviewId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid filter request -- the only required is reviewId in the body (also path!), others optional
  const filterBody = {
    reviewId,
    page: 1,
    limit: 5,
    moderation_status: RandomGenerator.pick([
      "approved",
      "rejected",
      "pending",
      "flagged",
      "blocked",
    ] as const),
    // Provide some optional dates within recent window for thoroughness
    created_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 30,
    ).toISOString(), // 30 days ago
    created_at_to: new Date().toISOString(),
  } satisfies IShoppingMallReviewResponse.IRequest;

  // 4. Make the main request (PATCH /shoppingMall/admin/reviews/{reviewId}/responses)
  const summary =
    await api.functional.shoppingMall.admin.reviews.responses.index(
      connection,
      {
        reviewId,
        body: filterBody,
      },
    );
  typia.assert(summary);

  // 4a. Confirm page structure
  TestValidator.predicate(
    "result pagination meta section present",
    summary.pagination !== null && typeof summary.pagination === "object",
  );
  TestValidator.predicate("data array present", Array.isArray(summary.data));
  TestValidator.predicate(
    "data array length <= limit",
    summary.data.length <= filterBody.limit!,
  );

  // 4b. If any data returned, check for filter match and DTO leakage
  for (const resp of summary.data) {
    typia.assert(resp);
    TestValidator.equals(
      "response.review.id matches requested reviewId",
      resp.review.id,
      reviewId,
    );
    if (filterBody.moderation_status)
      TestValidator.equals(
        "response moderation_status matches filter",
        resp.moderation_status,
        filterBody.moderation_status,
      );
    // Confirm only summary DTO properties present (no unexpected fields)
    const allowedKeys = [
      "id",
      "body",
      "withdrawn_at",
      "moderation_status",
      "moderation_reason",
      "created_at",
      "updated_at",
      "deleted_at",
      "review",
      "seller",
      "sellerSession",
    ];
    TestValidator.equals(
      "response only contains allowed fields",
      Object.keys(resp).sort(),
      allowedKeys.sort(),
    );
  }

  // 5. Negative test: invalid/nonexistent reviewId (should return empty data[])
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  const negativeResult =
    await api.functional.shoppingMall.admin.reviews.responses.index(
      connection,
      {
        reviewId: invalidReviewId,
        body: {
          reviewId: invalidReviewId,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReviewResponse.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.equals(
    "empty result for nonexistent reviewId",
    negativeResult.data.length,
    0,
  );

  // 6. Edge: Out-of-range page (should be empty)
  const outOfRangeResult =
    await api.functional.shoppingMall.admin.reviews.responses.index(
      connection,
      {
        reviewId,
        body: {
          reviewId,
          page: 99,
          limit: 5,
        } satisfies IShoppingMallReviewResponse.IRequest,
      },
    );
  typia.assert(outOfRangeResult);
  TestValidator.equals(
    "empty result for out-of-range page",
    outOfRangeResult.data.length,
    0,
  );

  // 7. Edge: Impossible filter (non-existent moderation status)
  const impossibleStatus = RandomGenerator.alphaNumeric(10) + "_nonexistent";
  const impossibleResult =
    await api.functional.shoppingMall.admin.reviews.responses.index(
      connection,
      {
        reviewId,
        body: {
          reviewId,
          moderation_status: impossibleStatus,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallReviewResponse.IRequest,
      },
    );
  typia.assert(impossibleResult);
  TestValidator.equals(
    "empty result for impossible moderation_status",
    impossibleResult.data.length,
    0,
  );
}
