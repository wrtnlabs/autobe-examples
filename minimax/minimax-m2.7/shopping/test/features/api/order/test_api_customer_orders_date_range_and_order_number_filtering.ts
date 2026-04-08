import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_orders_date_range_and_order_number_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        } satisfies Partial<IEcommerceMallShippingAddress.ICreate>,
      },
    );
  typia.assert(address);
  // 3. Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Create product with variants and set inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get variant from product
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  // Set inventory for the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId, variantId },
      body: {
        quantity: 10,
        operationType: "restock",
        reason: "Initial stock for testing",
      },
    },
  );
  // 5. Add to cart and checkout
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantId,
        quantity: 1,
      },
    },
  );
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // 6. Test filtering with date range and order number
  const orderCreatedAt = new Date(order.createdAt);
  const beforeOrderDate = new Date(
    orderCreatedAt.getTime() - 1000 * 60,
  ).toISOString();
  const afterOrderDate = new Date(
    orderCreatedAt.getTime() + 1000 * 60,
  ).toISOString();
  const partialOrderNumber = order.orderNumber.substring(0, 8);
  const orderListResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAtFrom: beforeOrderDate,
          createdAtTo: afterOrderDate,
          orderNumber: partialOrderNumber,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderListResponse);
  // Validate filtered results contain the order
  TestValidator.equals(
    "should find the order",
    orderListResponse.data.length > 0,
    true,
  );
  TestValidator.equals(
    "order number matches",
    orderListResponse.data[0].order_number,
    order.orderNumber,
  );
  TestValidator.predicate("order in date range", () => {
    const foundOrder = orderListResponse.data[0];
    const orderDate = new Date(foundOrder.created_at).getTime();
    return (
      orderDate >= new Date(beforeOrderDate).getTime() &&
      orderDate <= new Date(afterOrderDate).getTime()
    );
  });
  // 7. Test filtering with date range only
  const broaderDateRange = new Date();
  const earlierDate = new Date(
    broaderDateRange.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const laterDate = new Date(
    broaderDateRange.getTime() + 1000 * 60,
  ).toISOString();
  const dateOnlyResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAtFrom: earlierDate,
          createdAtTo: laterDate,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateOnlyResponse);
  TestValidator.equals(
    "should find orders in date range",
    dateOnlyResponse.data.length > 0,
    true,
  );
  TestValidator.predicate("pagination exists", () => {
    return (
      dateOnlyResponse.pagination !== null &&
      dateOnlyResponse.pagination !== undefined
    );
  });
  // 8. Test filtering with non-matching order number returns empty
  const nonMatchingResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          orderNumber: "NONEXISTENT-ORDER-12345",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(nonMatchingResponse);
  TestValidator.equals(
    "should return empty for non-matching order number",
    nonMatchingResponse.data.length,
    0,
  );
}
