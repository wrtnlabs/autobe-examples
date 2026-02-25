import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
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
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { generate_random_shopping_mall_seller_inventory_adjust_adjust_inventory } from "../../../generate/generate_random_shopping_mall_seller_inventory_adjust_adjust_inventory";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_seller_inventory_history_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create product variant
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            option_values: [
              {
                option_name: "size",
                option_value: RandomGenerator.alphaNumeric(5),
              },
            ],
            stock_quantity: 100,
          },
        ],
      },
    },
  );
  typia.assert(product);
  const variant = product.variants[0];
  // 3. Perform initial restock
  const initialRestock =
    await api.functional.shoppingMall.seller.inventory.restock(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(initialRestock);
  // 4. Create order item to trigger inventory deduction
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await api.functional.shoppingMall.customer.carts.items.create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 2,
      } satisfies IShoppingMallShoppingCartItem.ICreate,
    },
  );
  // 5. Perform manual adjustment
  await api.functional.shoppingMall.seller.inventory.adjust.adjustInventory(
    sellerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity_change: 50,
        reason: "adjustment",
        metadata: JSON.stringify({ reason: "physical count correction" }),
      } satisfies IShoppingMallInventoryHistory.ICreate,
    },
  );
  // 6. Wait briefly to ensure timestamps are different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 7. Test with date range filter
  const createdAtRange = [initialRestock.createdAt, new Date().toISOString()];
  const result =
    await api.functional.shoppingMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          created_at_range: createdAtRange,
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryHistory.IRequest,
      },
    );
  typia.assert(result);
  // 8. Validate results
  TestValidator.equals("returns records", result.data.length > 0, true);
  TestValidator.predicate(
    "all records within date range",
    result.data.every(
      (record) =>
        record.created_at >= createdAtRange[0] &&
        record.created_at <= createdAtRange[1],
    ),
  );
  // Check if records are sorted correctly (newest first)
  let isSortedCorrectly = true;
  for (let i = 1; i < result.data.length; i++) {
    const prevDate = new Date(result.data[i - 1].created_at).getTime();
    const currentDate = new Date(result.data[i].created_at).getTime();
    if (currentDate > prevDate) {
      isSortedCorrectly = false;
      break;
    }
  }
  TestValidator.predicate("sorted newest first", isSortedCorrectly);
  TestValidator.equals(
    "pagination metadata correct",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination metadata correct",
    result.pagination.current,
    1,
  );
}
