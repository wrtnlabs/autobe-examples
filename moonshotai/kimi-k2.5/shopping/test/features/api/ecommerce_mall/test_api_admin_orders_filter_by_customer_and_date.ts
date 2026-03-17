import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_admin_orders_filter_by_customer_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(seller);
  // 3. Create category (as admin)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product (as seller)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<100>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create variant (as seller)
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: product.basePrice,
          stock: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Create first customer and place order
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer1);
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customer1Connection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const order1 = await generate_random_ecommerce_mall_customer_checkout_create(
    customer1Connection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // 7. Create second customer and place order
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer2);
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customer2Connection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_ecommerce_mall_customer_checkout_create(
    customer2Connection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  // 8. Test filtering by customerId - should return only customer1's orders
  const customer1Orders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        customerId: customer1.id,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(customer1Orders);
  TestValidator.predicate(
    "customer1 filter returns only customer1 orders",
    customer1Orders.data.every((order) => order.id === order1.id),
  );
  TestValidator.equals(
    "customer1 orders count",
    customer1Orders.pagination.records,
    1,
  );
  // 9. Test filtering by customerId - should return only customer2's orders
  const customer2Orders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        customerId: customer2.id,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(customer2Orders);
  TestValidator.predicate(
    "customer2 filter returns only customer2 orders",
    customer2Orders.data.every((order) => order.id === order2.id),
  );
  TestValidator.equals(
    "customer2 orders count",
    customer2Orders.pagination.records,
    1,
  );
  // 10. Test date range filtering - createdAfter
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const ordersAfterYesterday =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdAfter: yesterday,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(ordersAfterYesterday);
  TestValidator.predicate(
    "createdAfter filter includes recent orders",
    ordersAfterYesterday.pagination.records >= 2,
  );
  // 11. Test date range filtering - createdBefore
  const ordersBeforeTomorrow =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        createdBefore: tomorrow,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(ordersBeforeTomorrow);
  TestValidator.predicate(
    "createdBefore filter includes recent orders",
    ordersBeforeTomorrow.pagination.records >= 2,
  );
  // 12. Test combined date range filter
  const ordersInRange = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        createdAfter: yesterday,
        createdBefore: tomorrow,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersInRange);
  TestValidator.predicate(
    "date range filter includes orders within range",
    ordersInRange.pagination.records >= 2,
  );
  // 13. Test combined filters (customer + date range)
  const customer1OrdersInRange =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        customerId: customer1.id,
        createdAfter: yesterday,
        createdBefore: tomorrow,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(customer1OrdersInRange);
  TestValidator.equals(
    "combined filter returns 1 order",
    customer1OrdersInRange.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter returns customer1 order",
    customer1OrdersInRange.data[0]?.id,
    order1.id,
  );
  // 14. Test pagination with filtered results
  const paginatedOrders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paginatedOrders);
  TestValidator.equals(
    "pagination limit respected",
    paginatedOrders.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedOrders.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedOrders.pagination.limit, 1);
  TestValidator.predicate(
    "pagination total records",
    paginatedOrders.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination total pages",
    paginatedOrders.pagination.pages >= 2,
  );
  // 15. Test status filter combined with customer filter
  const paidOrders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        customerId: customer1.id,
        status: "paid",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  TestValidator.equals(
    "status filter with customer returns order",
    paidOrders.pagination.records,
    1,
  );
}
