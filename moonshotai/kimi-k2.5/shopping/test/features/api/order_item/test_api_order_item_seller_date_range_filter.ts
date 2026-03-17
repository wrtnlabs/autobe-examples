import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test filtering order items by date range and sorting options to verify sellers can analyze sales within specific time periods.
 * The seller should be able to pass createdAtFrom and createdAtTo parameters along with sort options (created_at, price_at_purchase, quantity)
 * to retrieve historical sales data. This validates business analytics use cases where sellers review performance over time periods.
 *
 * Setup sequence:
 * 1. Seller, Admin, and Customer authenticate via join
 * 2. Admin creates a category for product classification
 * 3. Seller creates a product in that category
 * 4. Seller creates a product variant with SKU and pricing
 * 5. Customer adds the variant to shopping cart
 * 6. Customer completes checkout to generate order items
 * 7. Seller queries order items using date range filters and sorting options
 */
export async function test_api_order_item_seller_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connections and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller creates product in that category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant with SKU and pricing
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to shopping cart
  const cartItem = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem);
  // 6. Customer completes checkout to generate order items
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // Get the order item from the created order
  const orderItem = order.orderItems[0];
  typia.assertGuard(orderItem);
  // 7. Seller queries order items using date range filters and sorting options
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Test filtering by date range
  const filteredByDateRange: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: oneDayAgo.toISOString(),
          createdAtTo: oneDayLater.toISOString(),
          sellerId: seller.id,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  // Verify the order item is included in the results
  TestValidator.predicate(
    "order item exists in date range filter results",
    filteredByDateRange.data.some((item) => (item as IEcommerceMallOrderItem & IEntity).id === (orderItem as IEcommerceMallOrderItem & IEntity).id),
  );
  // Test sorting by created_at descending
  const sortedByCreatedAtDesc: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          sellerId: seller.id,
          sort: "created_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  // Test sorting by price_at_purchase
  const sortedByPrice: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          sellerId: seller.id,
          sort: "price_at_purchase",
          order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByPrice);
  // Test sorting by quantity
  const sortedByQuantity: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          sellerId: seller.id,
          sort: "quantity",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByQuantity);
  // Test date range that excludes the order item
  const pastDateRange: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orderItems.index(
      sellerConnection,
      {
        body: {
          createdAtFrom: new Date(
            now.getTime() - 48 * 60 * 60 * 1000,
          ).toISOString(),
          createdAtTo: new Date(
            now.getTime() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          sellerId: seller.id,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(pastDateRange);
  // Verify the order item is NOT included when filtering by past date range
  TestValidator.predicate(
    "order item not in past date range results",
    !pastDateRange.data.some((item) => (item as IEcommerceMallOrderItem & IEntity).id === (orderItem as IEcommerceMallOrderItem & IEntity).id),
  );
}