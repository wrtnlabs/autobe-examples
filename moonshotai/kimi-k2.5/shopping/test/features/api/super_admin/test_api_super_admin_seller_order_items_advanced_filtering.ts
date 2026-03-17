import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_super_admin_seller_order_items_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdmin setup - create new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 2. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const sellerId = seller.id;
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Add inventory stock
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock for testing",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 7-8. Create multiple orders (7 orders to test pagination with limit 5)
  for (let i = 0; i < 7; i++) {
    // Add variant to cart
    const cartItem =
      await generate_random_ecommerce_mall_customer_cart_items_create(
        customerConnection,
        {
          body: {
            productVariantId: variant.id,
            quantity: 1,
          } satisfies IEcommerceMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
    // Checkout to create order
    const order = await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {},
    );
    typia.assert(order);
  }
  // 9. Test search filter by product name
  const searchKeyword = product.name.substring(0, 5);
  const searchResult =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          search: searchKeyword,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filter returns results",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain only matching items",
    searchResult.data.every((item) =>
      item.product.name.includes(searchKeyword),
    ),
  );
  // 10. Test date range filter (createdAtFrom and createdAtTo)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          createdAtFrom: yesterday.toISOString(),
          createdAtTo: tomorrow.toISOString(),
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range returns all 7 items",
    dateRangeResult.data.length,
    7,
  );
  // 11. Test sort by price_at_purchase descending
  const priceDescResult =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          sort: "price_at_purchase",
          order: "desc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(priceDescResult);
  // Verify descending order: each item should have price >= next item
  for (let i = 1; i < priceDescResult.data.length; i++) {
    TestValidator.predicate(
      `price_at_purchase desc order at index ${i}`,
      priceDescResult.data[i - 1].priceAtPurchase >=
        priceDescResult.data[i].priceAtPurchase,
    );
  }
  // 12. Test sort by created_at ascending
  const createdAscResult =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          sort: "created_at",
          order: "asc",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(createdAscResult);
  // Verify ascending order: each item should have createdAt <= next item
  for (let i = 1; i < createdAscResult.data.length; i++) {
    const prevDate = new Date(createdAscResult.data[i - 1].createdAt).getTime();
    const currDate = new Date(createdAscResult.data[i].createdAt).getTime();
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      prevDate <= currDate,
    );
  }
  // 13. Test pagination with page=1, limit=5
  const page1Result =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 has 5 items", page1Result.data.length, 5);
  TestValidator.equals(
    "pagination shows total records",
    page1Result.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination shows correct total pages",
    page1Result.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination shows current page 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination shows limit 5",
    page1Result.pagination.limit,
    5,
  );
  // Test pagination with page=2, limit=5
  const page2Result =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: sellerId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 has remaining 2 items",
    page2Result.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total records consistent",
    page2Result.pagination.records,
    7,
  );
  TestValidator.equals(
    "pagination shows current page 2",
    page2Result.pagination.current,
    2,
  );
  // Verify pagination returns different items (no overlap)
  const page1Ids = new Set(page1Result.data.map((item) => item.id));
  const page2Ids = new Set(page2Result.data.map((item) => item.id));
  const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
  TestValidator.equals(
    "page 1 and page 2 have no overlapping items",
    intersection.length,
    0,
  );
}
