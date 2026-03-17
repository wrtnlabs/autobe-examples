import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_retrieval_public_active(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection to retrieve the review
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a test review ID (in a real scenario, this would be from an existing review)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the review as an unauthenticated guest user
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    guestConnection,
    {
      reviewId,
    },
  );
  typia.assert(retrievedReview);
  // 1. Validate basic review fields exist and have correct types
  TestValidator.equals(
    "review ID is valid UUID",
    retrievedReview.id,
    retrievedReview.id,
  );
  TestValidator.notEquals("review ID is defined", retrievedReview.id, null);
  // 2. Validate customer reference
  TestValidator.notEquals(
    "customer ID exists",
    retrievedReview.customer.id,
    null,
  );
  TestValidator.equals(
    "customer email format valid",
    retrievedReview.customer.email,
    retrievedReview.customer.email,
  );
  TestValidator.equals(
    "customer status exists",
    retrievedReview.customer.status,
    retrievedReview.customer.status,
  );
  TestValidator.notEquals(
    "customer created_at exists",
    retrievedReview.customer.created_at,
    null,
  );
  // 3. Validate product reference
  TestValidator.notEquals(
    "product ID exists",
    retrievedReview.product.id,
    null,
  );
  TestValidator.notEquals(
    "product name exists",
    retrievedReview.product.name,
    null,
  );
  TestValidator.notEquals(
    "product base_price exists",
    retrievedReview.product.base_price,
    null,
  );
  TestValidator.notEquals(
    "product slug exists",
    retrievedReview.product.slug,
    null,
  );
  TestValidator.notEquals(
    "product status exists",
    retrievedReview.product.status,
    retrievedReview.product.status,
  );
  TestValidator.notEquals(
    "product category exists",
    retrievedReview.product.category.id,
    null,
  );
  // 4. Validate order reference
  TestValidator.notEquals("order ID exists", retrievedReview.order.id, null);
  TestValidator.notEquals(
    "order number exists",
    retrievedReview.order.order_number,
    null,
  );
  TestValidator.notEquals(
    "order total_price exists",
    retrievedReview.order.total_price,
    null,
  );
  TestValidator.notEquals(
    "order status exists",
    retrievedReview.order.status,
    retrievedReview.order.status,
  );
  TestValidator.notEquals(
    "order shipping_address exists",
    retrievedReview.order.shipping_address.id,
    null,
  );
  // 5. Validate review-specific fields
  TestValidator.equals(
    "rating is between 1-5",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
    true,
  );
  TestValidator.equals(
    "body is not empty",
    retrievedReview.body.length > 0,
    true,
  );
  TestValidator.equals(
    "is_verified_purchase is boolean",
    typeof retrievedReview.is_verified_purchase === "boolean",
    true,
  );
  // 6. Validate timestamps
  TestValidator.notEquals(
    "created_at is defined",
    retrievedReview.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at is defined",
    retrievedReview.updated_at,
    null,
  );
  // 7. Validate deleted_at is null for active review
  TestValidator.equals(
    "deleted_at is null for active review",
    retrievedReview.deleted_at,
    null,
  );
  // 8. Validate title can be null or string
  if (retrievedReview.title !== null) {
    TestValidator.equals(
      "title is string when not null",
      typeof retrievedReview.title,
      "string",
    );
  }
}
