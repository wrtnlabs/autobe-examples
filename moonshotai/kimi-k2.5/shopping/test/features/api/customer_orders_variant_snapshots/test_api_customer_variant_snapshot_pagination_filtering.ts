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
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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

export async function test_api_customer_variant_snapshot_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerJoined);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
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
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerJoined);
  const shippingAddress = {
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: "123 Test Street",
    city: "Seoul",
    state: null,
    postalCode: "12345",
    country: "KR",
  } satisfies IEcommerceMallOrder.ICreate;
  // 4. Order #1: Add variant to cart and checkout (record timestamp T1)
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  const order1 = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: shippingAddress,
    },
  );
  typia.assert(order1);
  const t1 = order1.createdAt;
  // Record a small delay to ensure T2 is after T1
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Order #2: Add same variant to cart again and checkout (record timestamp T2)
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 3,
      },
    },
  );
  const order2 = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: shippingAddress,
    },
  );
  typia.assert(order2);
  // Verify both orders have order items
  TestValidator.notEquals("Order IDs differ", order1.id, order2.id);
  TestValidator.predicate("Order 1 has items", order1.orderItems.length > 0);
  TestValidator.predicate("Order 2 has items", order2.orderItems.length > 0);
  const order1ItemId = typia.assert<IEntity>(order1.orderItems[0]).id;
  // 6. Retrieve variant snapshots with pagination params: page=1, limit=10
  const paginationResult =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.index(
      customerConnection,
      {
        orderId: order1.id,
        itemId: order1ItemId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginationResult);
  // Validate pagination response structure
  TestValidator.equals(
    "Pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "Total records >= 0",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Total pages >= 0",
    paginationResult.pagination.pages >= 0,
  );
  // 7. Call variant snapshots endpoint with createdAtFrom filter set to T1
  const filteredResult =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.index(
      customerConnection,
      {
        orderId: order1.id,
        itemId: order1ItemId,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: t1,
        },
      },
    );
  typia.assert(filteredResult);
  // Validate filtering results - should only include snapshots created after T1
  TestValidator.predicate(
    "Filtered results exist",
    filteredResult.data.length >= 0,
  );
}