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
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_list_filtered_by_order_date_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register seller and customer
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 2. Create products with variants
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product1);
  const variant1 = product1.variants[0];
  if (!variant1) throw new Error("Product should have at least one variant");
  // 3. Customer adds item to cart and places first order
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant1.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerConnection,
  );
  const order1 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_1",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Create shipment for first order
  const orderItem1 = order1.orderItems[0];
  if (!orderItem1) throw new Error("Order should have at least one item");
  const shipment1 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order1.id,
          orderItemIds: [orderItem1.id],
          carrier: "DHL",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment1);
  const firstShipmentDate = shipment1.created_at;
  // Wait to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 200));
  // 5. Customer places second order with same/different product
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant1.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  await api.functional.ecommerceMall.customer.checkout.prepare(
    customerConnection,
  );
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_2",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order2);
  // 6. Create shipment for second order
  const orderItem2 = order2.orderItems[0];
  if (!orderItem2) throw new Error("Order should have at least one item");
  const shipment2 =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order2.id,
          orderItemIds: [orderItem2.id],
          carrier: "FedEx",
          trackingNumber: "TRACK789012",
        },
      },
    );
  typia.assert(shipment2);
  // 7. Test filtering by orderId - should return only shipments for that order
  const filteredByOrder1 =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: order1.id,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByOrder1);
  TestValidator.equals(
    "filter by orderId - first order",
    filteredByOrder1.data.length,
    1,
  );
  TestValidator.equals(
    "shipment orderId matches",
    filteredByOrder1.data[0].order.id,
    order1.id,
  );
  // 8. Test filtering by second orderId
  const filteredByOrder2 =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          orderId: order2.id,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByOrder2);
  TestValidator.equals(
    "filter by orderId - second order",
    filteredByOrder2.data.length,
    1,
  );
  TestValidator.equals(
    "shipment orderId matches second",
    filteredByOrder2.data[0].order.id,
    order2.id,
  );
  // 9. Test filtering by date range - only first shipment
  const filteredByDate =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: "2020-01-01T00:00:00.000Z",
          createdAtTo: firstShipmentDate,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "date range filter returns shipments",
    filteredByDate.data.length >= 1,
  );
  // 10. Test pagination - first page with limit
  const paginated1 = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(paginated1);
  TestValidator.equals("pagination limit 1", paginated1.data.length, 1);
  TestValidator.equals(
    "pagination current page",
    paginated1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    paginated1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 2",
    paginated1.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages >= 2",
    paginated1.pagination.pages >= 2,
  );
  // 11. Test pagination - second page
  const paginated2 = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        limit: 1,
        page: 2,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(paginated2);
  TestValidator.equals(
    "pagination page 2 data length",
    paginated2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page 2",
    paginated2.pagination.current,
    2,
  );
  TestValidator.predicate(
    "different shipment on page 2",
    paginated2.data[0].id !== paginated1.data[0].id,
  );
  // 12. Test combined filters (orderId + pagination)
  const combined = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: order1.id,
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined filter returns 1 result",
    combined.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter orderId correct",
    combined.data[0].order.id,
    order1.id,
  );
  // 13. Test carrier filter
  const filteredByCarrier =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier: "DHL",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(filteredByCarrier);
  TestValidator.predicate(
    "carrier filter works",
    filteredByCarrier.data.length >= 1,
  );
  for (const shipment of filteredByCarrier.data) {
    TestValidator.equals("carrier matches DHL", shipment.carrier, "DHL");
  }
}
