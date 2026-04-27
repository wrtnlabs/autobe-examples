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
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_product_ratings_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Generate common session metadata for login
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // ------------------------------------------------------------------
  // 1. Seller setup: join, create product, create variant
  // ------------------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(seller);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // ------------------------------------------------------------------
  // 2. Customer A setup
  // ------------------------------------------------------------------
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPassword = RandomGenerator.alphaNumeric(16);
  const customerA = await authorize_customer_join(customerAConnection, {
    body: { email: customerAEmail, password: customerAPassword },
  });
  typia.assert(customerA);
  const addressA =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(addressA);
  const cartItemA =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  const order1 = await generate_random_e_commerce_mall_customer_orders_create(
    customerAConnection,
    {
      body: { addressId: addressA.id },
    },
  );
  typia.assert(order1);
  const orderItem1 = order1.orderItems[0]!;
  // ------------------------------------------------------------------
  // 3. Seller creates shipment for Order 1
  // ------------------------------------------------------------------
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href,
      referrer,
    },
  });
  const shipment1 =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerLoginConnection,
      { body: { orderItemIds: [orderItem1.id] } },
    );
  typia.assert(shipment1);
  // ------------------------------------------------------------------
  // 4. Customer A confirms delivery and writes review (rating 4)
  // ------------------------------------------------------------------
  const customerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerALoginConnection, {
    body: {
      email: customerAEmail,
      password: customerAPassword,
      href,
      referrer,
    },
  });
  const deliveredShipment1 =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerALoginConnection,
      { shipmentId: shipment1.id, body: {} },
    );
  typia.assert(deliveredShipment1);
  const reviewA = await generate_random_e_commerce_mall_customer_reviews_create(
    customerALoginConnection,
    { body: { order_item_id: orderItem1.id, rating: 4 } },
  );
  typia.assert(reviewA);
  // ------------------------------------------------------------------
  // 5. Customer B setup
  // ------------------------------------------------------------------
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPassword = RandomGenerator.alphaNumeric(16);
  const customerB = await authorize_customer_join(customerBConnection, {
    body: { email: customerBEmail, password: customerBPassword },
  });
  typia.assert(customerB);
  const addressB =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerBConnection,
      {},
    );
  typia.assert(addressB);
  const cartItemB =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  const order2 = await generate_random_e_commerce_mall_customer_orders_create(
    customerBConnection,
    {
      body: { addressId: addressB.id },
    },
  );
  typia.assert(order2);
  const orderItem2 = order2.orderItems[0]!;
  // ------------------------------------------------------------------
  // 6. Seller creates shipment for Order 2
  // ------------------------------------------------------------------
  const sellerLoginConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href,
      referrer,
    },
  });
  const shipment2 =
    await generate_random_e_commerce_mall_seller_shipments_create(
      sellerLoginConnection2,
      { body: { orderItemIds: [orderItem2.id] } },
    );
  typia.assert(shipment2);
  // ------------------------------------------------------------------
  // 7. Customer B confirms delivery and writes review (rating 5)
  // ------------------------------------------------------------------
  const customerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerBLoginConnection, {
    body: {
      email: customerBEmail,
      password: customerBPassword,
      href,
      referrer,
    },
  });
  const deliveredShipment2 =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerBLoginConnection,
      { shipmentId: shipment2.id, body: {} },
    );
  typia.assert(deliveredShipment2);
  const reviewB = await generate_random_e_commerce_mall_customer_reviews_create(
    customerBLoginConnection,
    { body: { order_item_id: orderItem2.id, rating: 5 } },
  );
  typia.assert(reviewB);
  // ------------------------------------------------------------------
  // 8. Query ratings and validate
  // ------------------------------------------------------------------
  const ratings =
    await api.functional.eCommerceMall.customer.products.ratings.at(
      customerALoginConnection,
      { productId: product.id },
    );
  typia.assert(ratings);
  TestValidator.equals("total review count", ratings.totalCount, 2);
  TestValidator.equals("average rating", ratings.averageRating, 4.5);
}
