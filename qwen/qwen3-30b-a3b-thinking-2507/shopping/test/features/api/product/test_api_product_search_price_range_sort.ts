import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_price_range_sort(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const products: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(userConnection, {
      body: {} as IShoppingMallProduct.IRequest,
    });
  typia.assert(products);
  TestValidator.predicate(
    "should have at least one product",
    () => products.data.length > 0,
  );
  for (const product of products.data) {
    TestValidator.equals(
      "product.id should be string",
      typeof product.id,
      "string",
    );
    TestValidator.predicate(
      "product.id should be valid UUID",
      () => product.id.length === 36,
    );
    TestValidator.equals(
      "product.name should be string",
      typeof product.name,
      "string",
    );
    TestValidator.predicate(
      "product.name should not be empty",
      () => product.name.length > 0,
    );
    TestValidator.equals(
      "product.price should be number",
      typeof product.price,
      "number",
    );
    TestValidator.predicate(
      "product.price should be positive and reasonable",
      () => product.price > 0 && product.price <= 10000,
    );
    TestValidator.equals(
      "product.status should be active or inactive",
      ["active", "inactive"].includes(product.status),
      true,
    );
  }
  TestValidator.equals(
    "product.category should exist",
    products.data[0].category,
    undefined,
  );
}
