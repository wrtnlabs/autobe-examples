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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
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
 * Test scenario for seller filtering order items by fulfillment status.
 * Verifies that the status filter in IEcommerceMallOrderItem.IRequest correctly filters results.
 * 1. Admin creates a category
 * 2. Seller creates a product with variant
 * 3. Customer adds variant to cart and checks out (creates order with 'paid' status items)
 * 4. Seller queries order items filtered by different status values
 * 5. Validates that only matching items are returned for each status filter
 */
export async function test_api_seller_order_item_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: typia.random<string>(),
      } satisfies DeepPartial<IEcommerceMallCategory.ICreate> as DeepPartial<IEcommerceMallCategory.ICreate>,
    },
  );
  typia.assert(category);
  // 2. Authenticate as seller and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1>>(),
        description: typia.random<string & tags.MinLength<1>>(),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1000>>(),
      } satisfies DeepPartial<IEcommerceMallProduct.ICreate> as DeepPartial<IEcommerceMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: typia.random<string & tags.MinLength<1>>(),
          options: [
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: typia.random<number & tags.Minimum<0>>(),
          stock: 100,
        } satisfies DeepPartial<IEcommerceMallProductVariant.ICreate> as DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 3. Authenticate as customer and create order through checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(customer);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies DeepPartial<IEcommerceMallCartItem.ICreate> as DeepPartial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: typia.random<string>(),
        recipientPhone: typia.random<string>(),
        streetAddress: typia.random<string>(),
        city: typia.random<string>(),
        state: null,
        postalCode: typia.random<string>(),
        country: typia.random<string>(),
      } satisfies DeepPartial<IEcommerceMallOrder.ICreate> as DeepPartial<IEcommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  // Verify order was created with paid status items
  TestValidator.predicate(
    "order should have items",
    order.orderItems.length > 0,
  );
  TestValidator.equals(
    "order item status should be paid",
    order.orderItems[0].status,
    "paid",
  );
  // 4. Seller queries order items filtered by different status values
  // Test with 'paid' filter - should return items
  const paidResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          status: "paid",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paidResult);
  TestValidator.predicate(
    "paid filter should return items",
    paidResult.data.length > 0,
  );
  TestValidator.equals(
    "all returned items should have paid status",
    paidResult.data.every((item) => item.status === "paid"),
    true,
  );
  // Test with 'shipped' filter - should return empty (since order is just created)
  const shippedResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          status: "shipped",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedResult);
  TestValidator.equals(
    "shipped filter should return empty",
    shippedResult.data.length,
    0,
  );
  // Test with 'delivered' filter - should return empty
  const deliveredResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          status: "delivered",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredResult);
  TestValidator.equals(
    "delivered filter should return empty",
    deliveredResult.data.length,
    0,
  );
  // Test with 'cancelled' filter - should return empty
  const cancelledResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          status: "cancelled",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(cancelledResult);
  TestValidator.equals(
    "cancelled filter should return empty",
    cancelledResult.data.length,
    0,
  );
  // Test with 'refunded' filter - should return empty
  const refundedResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          status: "refunded",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(refundedResult);
  TestValidator.equals(
    "refunded filter should return empty",
    refundedResult.data.length,
    0,
  );
  // Test without status filter - should return all items
  const allResult: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "no filter should return all items",
    allResult.data.length > 0,
  );
  TestValidator.equals(
    "all items returned when no filter",
    allResult.data.length,
    order.orderItems.length,
  );
}
