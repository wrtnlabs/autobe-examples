import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuInventory";
import type { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

export async function test_api_sku_inventory_list_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Seller registers
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerStoreName = RandomGenerator.name();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPass123!",
        store_name: sellerStoreName,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Seller logs in
  const href = `https://${typia.random<string & tags.Format<"hostname">>()}/login`;
  const referrer = `https://${typia.random<string & tags.Format<"hostname">>()}/home`;
  const loginInput = {
    email: sellerEmail,
    password: "StrongPass123!",
    href: href,
    referrer: referrer,
  } satisfies IShoppingMallSeller.ILogin;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, { body: loginInput });
  typia.assert(sellerAuthorized);

  // Step 3: Seller queries SKU inventories
  const requestBody = {
    page: 1,
    limit: 10,
    search_text: null,
    shopping_mall_product_sku_code: null,
    stock_status: null,
    min_quantity: null,
    max_quantity: null,
    sort_by: null,
    order: null,
    date_from: null,
    date_to: null,
  } satisfies IShoppingMallSkuInventory.IRequest;

  const result: IPageIShoppingMallSkuInventory.ISummary =
    await api.functional.shoppingMall.seller.skuInventories.index(connection, {
      body: requestBody,
    });

  typia.assert(result);

  // Validations on pagination and data
  const { pagination, data } = result;

  TestValidator.predicate(
    "page number should be positive integer",
    Number.isInteger(pagination.current) && pagination.current > 0,
  );
  TestValidator.predicate(
    "limit should be positive integer",
    Number.isInteger(pagination.limit) && pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative integer",
    Number.isInteger(pagination.records) && pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is positive integer",
    Number.isInteger(pagination.pages) && pagination.pages > 0,
  );

  TestValidator.predicate("data is an array", Array.isArray(data));

  for (const inventory of data) {
    typia.assert(inventory);
    TestValidator.predicate(
      "inventory quantity is integer and non-negative",
      Number.isInteger(inventory.quantity) && inventory.quantity >= 0,
    );
    TestValidator.predicate(
      "inventory stock status is string",
      typeof inventory.stock_status === "string",
    );
    TestValidator.predicate(
      "product SKU summary has sku_code",
      typeof inventory.productSku.sku_code === "string",
    );
  }
}
