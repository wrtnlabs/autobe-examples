import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test successful deletion of own review by the customer who created it.
 *
 * Validates that a customer can delete their own review after creating it.
 * The review should be soft-deleted upon successful deletion.
 *
 * Prerequisites Setup:
 * 1. Authenticate as seller and create a product with variants
 * 2. Authenticate as customer and add product to cart (order created via checkout process)
 * 3. As seller, create a shipment containing the order item
 * 4. As customer, confirm delivery of the shipment
 * 5. Customer creates a review for the delivered order item
 *
 * Test Steps:
 * 1. Call DELETE /ecommerceMall/customer/reviews/{reviewId} with the reviewId
 * 2. Include proper authorization headers for the customer
 *
 * Validation Points:
 * - Response status is 200 OK indicating successful deletion
 * - Review is soft-deleted, preserving historical audit trail
 */
export async function test_api_customer_review_delete_own_review_success(
  connection: api.IConnection,
): Promise<void> {
  // === 1. Seller Setup - Create product ===
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Get a variant from the product for the cart item
  const variant = product.variants[0];
  typia.assert(variant);
  // === 2. Customer Setup ===
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customerAuth);
  // === 3. Add product to cart ===
  const cartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // === 4. Seller creates shipment ===
  // The utility handles finding/creating appropriate order items internally
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {},
    );
  typia.assert(shipment);
  typia.assert(shipment.shipment_items.length > 0);
  // === 5. Customer confirms delivery ===
  const delivery: IEcommerceMallShipmentDelivery =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(delivery);
  TestValidator.equals("delivery confirmed", delivery.shipment.id, shipment.id);
  TestValidator.predicate("is manual delivery", !delivery.isAutoDelivered);
  // Get the order item ID from the shipment for review creation
  const shippedOrderItemId = shipment.shipment_items[0].orderItem.id;
  // === 6. Customer creates a review ===
  const review: IEcommerceMallReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          orderItemId: shippedOrderItemId,
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review customer matches",
    typia.assert<IEntity>(review.customer).id,
    customerAuth.id,
  );
  TestValidator.equals(
    "review order item matches",
    review.orderItemId,
    shippedOrderItemId,
  );
  // === 7. Delete the review ===
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // Deletion succeeded - void return indicates 200 OK
  TestValidator.predicate("review deletion successful", true);
}