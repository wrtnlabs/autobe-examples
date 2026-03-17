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

export async function test_api_product_review_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Test data generation
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the active product review
  const review = await api.functional.ecommerceMall.reviews.at(connection, {
    reviewId,
  });
  typia.assert(review);
  // Validate rating is within valid range (1-5 stars)
  TestValidator.predicate(
    "rating valid range",
    review.rating >= 1 && review.rating <= 5,
  );
  // Validate body text is not empty
  TestValidator.predicate("review body not empty", review.body.length > 0);
  // Validate deleted_at is null (active review)
  TestValidator.equals("deleted_at is null", review.deleted_at, null);
  // Validate is_verified_purchase is true (order was completed)
  TestValidator.equals("verified purchase", review.is_verified_purchase, true);
  // Validate customer has required fields
  TestValidator.equals(
    "customer has valid id format",
    review.customer.id.match(/^[0-9a-f-]{36}$/i) !== null,
    true,
  );
  TestValidator.equals(
    "customer email matches format",
    review.customer.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/i) !== null,
    true,
  );
  TestValidator.equals(
    "customer has status",
    review.customer.status !== null,
    true,
  );
  // Validate product has required fields
  TestValidator.equals(
    "product has valid id format",
    review.product.id.match(/^[0-9a-f-]{36}$/i) !== null,
    true,
  );
  TestValidator.predicate(
    "product name is not empty",
    review.product.name.length > 0,
  );
  TestValidator.predicate(
    "product base_price is positive",
    review.product.base_price > 0,
  );
  TestValidator.predicate(
    "product slug is not empty",
    review.product.slug.length > 0,
  );
  TestValidator.predicate(
    "product status is set",
    review.product.status !== null,
  );
  // Validate order has required fields
  TestValidator.equals(
    "order has valid id format",
    review.order.id.match(/^[0-9a-f-]{36}$/i) !== null,
    true,
  );
  TestValidator.predicate(
    "order order_number is not empty",
    review.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order total_price is positive",
    review.order.total_price > 0,
  );
  TestValidator.predicate("order status is set", review.order.status !== null);
  // Validate shipping address has required fields
  TestValidator.equals(
    "shipping address has valid id format",
    review.order.shipping_address.id.match(/^[0-9a-f-]{36}$/i) !== null,
    true,
  );
  TestValidator.predicate(
    "shipping address recipient_name is not empty",
    review.order.shipping_address.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "shipping address recipient_phone is not empty",
    review.order.shipping_address.recipient_phone.length > 0,
  );
  TestValidator.predicate(
    "shipping address street is not empty",
    review.order.shipping_address.street.length > 0,
  );
  TestValidator.predicate(
    "shipping address city is not empty",
    review.order.shipping_address.city.length > 0,
  );
  TestValidator.predicate(
    "shipping address state is not empty",
    review.order.shipping_address.state.length > 0,
  );
  TestValidator.equals(
    "shipping address has is_default",
    review.order.shipping_address.is_default !== null,
    true,
  );
}
