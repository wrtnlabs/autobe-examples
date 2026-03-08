import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create multiple variants with distinct SKU codes and prices
  const variants: IShoppingMallProductVariant[] = [];
  const skuPrefix = "TEST-SKU-" + RandomGenerator.alphaNumeric(4).toUpperCase();
  for (let i = 0; i < 5; i++) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            skuCode: `${skuPrefix}-${String(i + 1).padStart(3, "0")}`,
            optionValues: {
              color: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
              ]),
              size: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
            price: (i + 1) * 100,
          },
        },
      );
    typia.assert(variant);
    variants.push(variant);
    // 4. Add inventory to set various stock levels
    const stockQuantity = (i + 1) * 10;
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: stockQuantity,
          reason: "Initial stock for testing",
        },
      },
    );
  }
  // Test 1: Search functionality - partial SKU match
  const searchResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: skuPrefix,
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching variants",
    searchResult.data.every((v) => v.sku_code.includes(skuPrefix)),
  );
  // Test 2: Case-insensitive search
  const lowerCaseSearch =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: skuPrefix.toLowerCase(),
        },
      },
    );
  typia.assert(lowerCaseSearch);
  TestValidator.equals(
    "case-insensitive search",
    lowerCaseSearch.data.length,
    variants.length,
  );
  // Test 3: Pagination - limit
  const limitedResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(limitedResult);
  TestValidator.equals("limit restricts results", limitedResult.data.length, 2);
  TestValidator.equals("pagination limit", limitedResult.pagination.limit, 2);
  // Test 4: Pagination - page navigation
  const page1 = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        limit: 2,
        page: 2,
      },
    },
  );
  typia.assert(page2);
  TestValidator.predicate(
    "different pages have different results",
    page1.data[0].id !== page2.data[0].id,
  );
  TestValidator.equals("current page", page1.pagination.current, 1);
  TestValidator.equals("total records", page1.pagination.records, 5);
  // Test 5: Sorting - created_at_desc (newest first)
  const sortedByDate =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "created_at_desc",
          limit: 100,
        },
      },
    );
  typia.assert(sortedByDate);
  for (let i = 0; i < sortedByDate.data.length - 1; i++) {
    TestValidator.predicate(
      "created_at_desc sorting",
      new Date(sortedByDate.data[i].created_at) >=
        new Date(sortedByDate.data[i + 1].created_at),
    );
  }
  // Test 6: Sorting - stock_desc (highest stock first)
  const sortedByStock =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "stock_desc",
          limit: 100,
        },
      },
    );
  typia.assert(sortedByStock);
  for (let i = 0; i < sortedByStock.data.length - 1; i++) {
    TestValidator.predicate(
      "stock_desc sorting",
      sortedByStock.data[i].stock_quantity >=
        sortedByStock.data[i + 1].stock_quantity,
    );
  }
  // Test 7: Sorting - product_name_asc (alphabetical)
  const sortedByName =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "product_name_asc",
          limit: 100,
        },
      },
    );
  typia.assert(sortedByName);
  for (let i = 0; i < sortedByName.data.length - 1; i++) {
    TestValidator.predicate(
      "product_name_asc sorting",
      sortedByName.data[i].product.name.localeCompare(
        sortedByName.data[i + 1].product.name,
      ) <= 0,
    );
  }
  // Test 8: Verify pagination metadata accuracy
  const allVariants = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(allVariants);
  TestValidator.equals(
    "total records matches created variants",
    allVariants.pagination.records,
    variants.length,
  );
  TestValidator.predicate(
    "pages calculation correct",
    allVariants.pagination.pages >= 1,
  );
}