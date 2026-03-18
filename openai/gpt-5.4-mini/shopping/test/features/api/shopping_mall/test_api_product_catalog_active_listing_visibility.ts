import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_catalog_active_listing_visibility(
  connection: api.IConnection,
): Promise<void> {
  const broadResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(broadResponse);
  TestValidator.equals(
    "broad pagination current",
    broadResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "broad pagination limit",
    broadResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "broad pagination records non-negative",
    broadResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "broad pagination pages non-negative",
    broadResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "broad pagination count matches data length on first page when no overflow",
    broadResponse.data.length <= broadResponse.pagination.limit,
    true,
  );
  TestValidator.predicate(
    "public browse results expose only public summary shape",
    broadResponse.data.every((product) => {
      const keys = Object.keys(product).sort();
      return (
        keys.includes("id") &&
        keys.includes("name") &&
        keys.includes("description") &&
        keys.includes("basePrice") &&
        keys.includes("seller") &&
        keys.includes("category") &&
        keys.includes("createdAt") &&
        keys.includes("updatedAt") &&
        keys.includes("deletedAt") &&
        !keys.some((key) => key.toLowerCase().includes("snapshot")) &&
        !keys.some((key) => key.toLowerCase().includes("variant")) &&
        !keys.some((key) => key.toLowerCase().includes("inventory"))
      );
    }),
  );
  TestValidator.predicate(
    "each product summary includes seller and optional category context",
    broadResponse.data.every(
      (product) =>
        product.seller !== null &&
        typeof product.seller.email === "string" &&
        typeof product.seller.sellerProfile.shopName === "string" &&
        (product.category === null ||
          typeof product.category.name === "string"),
    ),
  );
  const inStockOnlyResponse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        inStockOnly: true,
        sort: "newest",
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(inStockOnlyResponse);
  TestValidator.equals(
    "in-stock pagination current",
    inStockOnlyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "in-stock pagination limit",
    inStockOnlyResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "in-stock pagination records non-negative",
    inStockOnlyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "in-stock pagination pages non-negative",
    inStockOnlyResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "in-stock results are a subset of public summaries",
    inStockOnlyResponse.data.every((product) => {
      const keys = Object.keys(product).sort();
      return (
        keys.includes("id") &&
        keys.includes("name") &&
        keys.includes("description") &&
        keys.includes("basePrice") &&
        keys.includes("seller") &&
        keys.includes("category") &&
        keys.includes("createdAt") &&
        keys.includes("updatedAt") &&
        keys.includes("deletedAt")
      );
    }),
  );
  TestValidator.predicate(
    "in-stock results do not expose internal snapshot or state fields",
    inStockOnlyResponse.data.every((product) => {
      const keys = Object.keys(product);
      return !keys.some(
        (key) =>
          key.toLowerCase().includes("snapshot") ||
          key.toLowerCase().includes("history") ||
          key.toLowerCase().includes("inventory") ||
          key.toLowerCase().includes("detail"),
      );
    }),
  );
}
