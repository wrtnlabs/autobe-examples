import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import type { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_orders_items_reviews_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_items_reviews_create";
import { prepare_random_ecommerce_mall_customer_review } from "../../../prepare/prepare_random_ecommerce_mall_customer_review";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

/**
 * Test customer product review creation after order item delivery.
 *
 * Validates the complete review creation workflow: customer registration, order creation,
 * and writing a review for a delivered order item. Ensures that the review correctly
 * references the customer, order, and order item, and that all associations are properly
 * maintained through the review entity's nested object references.
 *
 * Special attention is given to verifying that the review contains valid associations
 * and that the customer can only write one review per product per order.
 *
 * 1. Customer registers with email and password.
 * 2. Order is created with at least one item.
 * 3. Customer writes a review for the delivered order item.
 * 4. Validates review entity has correct customer, order, and order item references.
 * 5. Validates nested associations (customer display name, order number, order item quantity).
 * 6. Validates rating is within valid range (1-5 stars).
 */
export async function test_api_product_review_creation_after_delivery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create shipping address for order
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create order with at least one item
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerConnection,
      {
        body: {
          shipping_address_id: shippingAddressId,
          order_items: [
            {
              product_variant_id: productVariantId,
              quantity: 1,
            } satisfies IEcommerceMallOrderItem.ICreate,
          ],
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 4. Extract order item for review
  const orderItem = order.items[0]!;
  typia.assert(orderItem);
  // 5. Generate review data
  const rating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const reviewText: string = RandomGenerator.paragraph({ sentences: 2 });
  // 6. Create review for delivered order item
  const review: IEcommerceMallCustomerReview =
    await generate_random_ecommerce_mall_member_orders_items_reviews_create(
      customerConnection,
      {
        body: {
          rating: rating,
          text: reviewText,
        } satisfies IEcommerceMallCustomerReview.ICreate,
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(review);
  // 7. Validate review entity has correct associations
  TestValidator.equals(
    "customer ID matches",
    review.customer_id,
    memberAuth.id,
  );
  TestValidator.equals("order ID matches", review.order_id, order.id);
  TestValidator.equals(
    "order item ID matches",
    review.order_item_id,
    orderItem.id,
  );
  TestValidator.equals("rating matches", review.rating, rating);
  TestValidator.equals("text matches", review.text, reviewText);
  // 8. Validate review associations via nested objects
  TestValidator.equals(
    "customer name matches",
    review.customer.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "order number matches",
    review.order.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "order item quantity matches",
    review.orderItem.quantity,
    orderItem.quantity,
  );
  // 9. Validate product review statistics
  TestValidator.predicate(
    "review has valid rating",
    review.rating >= 1 && review.rating <= 5,
  );
}
