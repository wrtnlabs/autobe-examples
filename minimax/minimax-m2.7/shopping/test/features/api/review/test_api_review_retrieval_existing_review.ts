import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_customers_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_orders_items_review_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_retrieval_existing_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/customer",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.customer.login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "https://example.com/customer",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  // 3. Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Get the first variant from product
  const variant = product.variants[0];
  typia.assert(variant);
  // 4. Customer adds product to cart
  await api.functional.ecommerceMall.customer.cart.items.create(
    customerLoginConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 5. Customer prepares checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerLoginConnection,
    );
  typia.assert(checkoutPrepare);
  // 6. Customer confirms checkout (place order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token:
            "test_payment_token_" + RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 7. Seller creates shipment
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "TestCarrier",
        trackingNumber: "TRACK" + RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerLoginConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 9. Customer creates review for the delivered order item
  const review =
    await api.functional.ecommerceMall.customer.customers.orders.items.review.create(
      customerLoginConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
  typia.assert(review);
  // 10. Retrieve the review by ID (GET /reviews/{reviewId})
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    customerLoginConnection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  // 11. Validate retrieved review
  TestValidator.equals("review ID matches", retrievedReview.id, review.id);
  TestValidator.predicate(
    "rating is valid (1-5)",
    retrievedReview.rating >= 1 && retrievedReview.rating <= 5,
  );
  TestValidator.equals(
    "review ID is uuid format",
    retrievedReview.id.length,
    36,
  );
  TestValidator.predicate(
    "has creation timestamp",
    retrievedReview.created_at.length > 0,
  );
  TestValidator.predicate("has customer info", !!retrievedReview.customer);
  TestValidator.predicate("has product info", !!retrievedReview.product);
  TestValidator.predicate("has order item info", !!retrievedReview.orderItem);
}
