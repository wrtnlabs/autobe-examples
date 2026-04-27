import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_product_rating_with_customer_reviews(
  connection: api.IConnection,
): Promise<void> {
  // ---------------------------------------------------------------
  // 1. SELLER SETUP
  // ---------------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // The product must have at least one variant to be purchasable.
  // If no variants exist, the test cannot proceed.
  const variant = product.variants[0];
  if (variant === undefined) {
    throw new Error(
      "Product has no variants - cannot add to cart. " +
        "The product must have at least one variant to be purchasable.",
    );
  }
  // ---------------------------------------------------------------
  // 2. Define a reusable purchase-and-review flow
  // ---------------------------------------------------------------
  async function purchaseAndReview(rating: number): Promise<{
    customerConnection: api.IConnection;
    orderItemId: string;
  }> {
    // Customer join
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
    typia.assert(customerAuth);
    // Create shipping address
    const address =
      await generate_random_e_commerce_mall_customer_addresses_create(
        customerConnection,
        {},
      );
    typia.assert(address);
    // Add variant to cart
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
    // Place order
    const order = await generate_random_e_commerce_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          addressId: address.id,
        },
      },
    );
    typia.assert(order);
    const orderItem = order.orderItems[0]!;
    // Seller creates shipment
    const shipment =
      await generate_random_e_commerce_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {
            orderItemIds: [orderItem.id],
            carrierName: RandomGenerator.alphaNumeric(8),
            trackingNumber: RandomGenerator.alphaNumeric(12),
          },
        },
      );
    typia.assert(shipment);
    // Customer confirms delivery
    const deliveredShipment =
      await api.functional.eCommerceMall.customer.shipments.update(
        customerConnection,
        {
          shipmentId: shipment.id,
          body: {},
        },
      );
    typia.assert(deliveredShipment);
    // Customer writes review
    const review =
      await generate_random_e_commerce_mall_customer_reviews_create(
        customerConnection,
        {
          body: {
            order_item_id: orderItem.id,
            rating: rating,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(review);
    return {
      customerConnection,
      orderItemId: orderItem.id,
    };
  }
  // ---------------------------------------------------------------
  // 3-5. Create three customers with ratings 5, 3, and 4
  // ---------------------------------------------------------------
  await purchaseAndReview(5);
  await purchaseAndReview(3);
  await purchaseAndReview(4);
  // ---------------------------------------------------------------
  // 6. Query product ratings - verify aggregation
  // ---------------------------------------------------------------
  const ratings = await api.functional.eCommerceMall.seller.products.ratings.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(ratings);
  TestValidator.equals("total count with 3 reviews", ratings.totalCount, 3);
  TestValidator.equals(
    "average rating of [5, 3, 4] = 4.0",
    ratings.averageRating,
    4.0,
  );
}
