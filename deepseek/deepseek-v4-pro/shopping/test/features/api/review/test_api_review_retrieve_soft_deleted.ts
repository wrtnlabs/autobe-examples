import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";

export async function test_api_review_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Create a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 3. Soft-delete the review
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 4. Retrieve the soft-deleted review
  const retrieved = await api.functional.shoppingMall.customer.reviews.at(
    customerConnection,
    { reviewId: review.id },
  );
  typia.assert(retrieved);
  // 5. Validate soft-deleted review preserves all business data
  TestValidator.equals("review id preserved", retrieved.id, review.id);
  TestValidator.equals("rating preserved", retrieved.rating, review.rating);
  TestValidator.equals("content preserved", retrieved.content, review.content);
  TestValidator.equals(
    "created_at preserved",
    retrieved.created_at,
    review.created_at,
  );
  TestValidator.predicate(
    "deleted_at is now non-null after soft-deletion",
    retrieved.deleted_at !== null,
  );
  TestValidator.predicate(
    "customer relation preserved",
    retrieved.customer !== null,
  );
  TestValidator.predicate(
    "product relation preserved",
    retrieved.product !== null,
  );
  TestValidator.predicate("order relation preserved", retrieved.order !== null);
  TestValidator.predicate(
    "orderItem relation preserved",
    retrieved.orderItem !== null,
  );
}
