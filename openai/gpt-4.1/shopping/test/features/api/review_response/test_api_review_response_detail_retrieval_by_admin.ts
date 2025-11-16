import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewResponse";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can retrieve detailed seller review response
 * info.
 *
 * 1. Register a new admin via /auth/admin/join to establish admin context.
 * 2. Generate random UUIDs for reviewId and responseId.
 * 3. Call /shoppingMall/admin/reviews/{reviewId}/responses/{responseId} as admin
 *    to fetch seller response detail.
 * 4. Assert the result matches IShoppingMallReviewResponse and includes all
 *    fields:
 *
 *    - Body, moderation status, withdrawn_at, moderation_reason, created_at,
 *         updated_at, deleted_at, review reference, seller reference.
 * 5. Confirm admin-only fields (moderation/audit info) are present and correct.
 */
export async function test_api_review_response_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Prepare random reviewId and responseId
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const responseId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to retrieve seller response details as admin
  const detail: IShoppingMallReviewResponse =
    await api.functional.shoppingMall.admin.reviews.responses.at(connection, {
      reviewId,
      responseId,
    });
  typia.assert(detail);

  // 4. Validate all fields are present and plausible according to schema
  TestValidator.predicate(
    "response body present",
    typeof detail.body === "string" &&
      detail.body.length >= 10 &&
      detail.body.length <= 1000,
  );
  TestValidator.predicate(
    "valid moderation_status",
    typeof detail.moderation_status === "string" &&
      detail.moderation_status.length > 0,
  );
  TestValidator.predicate(
    "review reference exists",
    !!detail.review &&
      typeof detail.review.id === "string" &&
      detail.review.id.length > 0,
  );
  TestValidator.predicate(
    "seller reference exists",
    !!detail.seller &&
      typeof detail.seller.id === "string" &&
      detail.seller.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof detail.created_at === "string" &&
      !isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof detail.updated_at === "string" &&
      !isNaN(Date.parse(detail.updated_at)),
  );
  // Optional fields: withdrawn_at, moderation_reason, deleted_at can be null/undefined or valid date/strings

  // 5. Confirm admin is permitted to see audit/moderation fields (moderation_status, moderation_reason, deleted_at)
  TestValidator.predicate(
    "admin has access to moderation fields",
    "moderation_status" in detail && "moderation_reason" in detail,
  );
}
