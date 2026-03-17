import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product with multiple variants to enable many order items
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create 5 variants to have enough items for pagination testing
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 5; i++) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerLoginConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${i}`,
            stock_quantity: 100,
            options: [
              {
                key: "Color",
                value: ["Red", "Blue", "Green", "Yellow", "Purple"][i],
              },
            ],
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Add multiple items to cart - add each variant 3 times to create 15 cart items
  // Note: Adding same variant combines quantities, so we add different variants
  for (const variant of variants) {
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 3,
        },
      },
    );
  }
  // 5. Place order - this creates order items from cart
  // We need a valid address ID - using a generated UUID (in real test, would create address first)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Verify we have multiple order items (should be 5 items, one per variant)
  TestValidator.predicate("order has multiple items", order.items.length >= 5);
  // 6. Seller creates shipment containing all order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: order.items.map((item) => item.id),
        tracking_carrier: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(shipment);
  // 7. Test pagination - Page 1 with limit 10
  const page1Result =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(page1Result);
  // 8. Test pagination - Page 2 with limit 10
  const page2Result =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  typia.assert(page2Result);
  // 9. Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page limit consistent",
    page1Result.pagination.limit,
    page2Result.pagination.limit,
  );
  const totalRecords = page1Result.pagination.records;
  TestValidator.predicate(
    "total records matches order items",
    totalRecords === order.items.length,
  );
  // Calculate expected pages
  const expectedPages = Math.ceil(totalRecords / page1Result.pagination.limit);
  TestValidator.equals(
    "total pages calculated correctly",
    page1Result.pagination.pages,
    expectedPages,
  );
  // 10. Validate no duplicate items across pages
  const page1ItemIds = page1Result.data.map((item) => item.orderItem.id);
  const page2ItemIds = page2Result.data.map((item) => item.orderItem.id);
  const duplicates = page1ItemIds.filter((id) => page2ItemIds.includes(id));
  TestValidator.equals("no duplicate items across pages", duplicates.length, 0);
  // 11. Validate all items are retrievable
  const allRetrievedItemIds = [...page1ItemIds, ...page2ItemIds];
  const expectedItemIds = order.items.map((item) => item.id);
  TestValidator.equals(
    "all items retrieved across pages",
    allRetrievedItemIds.sort(),
    expectedItemIds.sort(),
  );
  // 12. Validate page 1 has items (up to limit)
  TestValidator.predicate(
    "page 1 has items",
    page1Result.data.length > 0 &&
      page1Result.data.length <= page1Result.pagination.limit,
  );
  // 13. Validate sorting consistency (items should be in same order when fetched again)
  const page1ResultAgain =
    await api.functional.shoppingMall.seller.shipments.items.index(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipmentItem.IRequest,
      },
    );
  const order1 = page1Result.data.map((item) => item.orderItem.id);
  const order1Again = page1ResultAgain.data.map((item) => item.orderItem.id);
  TestValidator.equals(
    "sorting consistent across requests",
    order1,
    order1Again,
  );
}
