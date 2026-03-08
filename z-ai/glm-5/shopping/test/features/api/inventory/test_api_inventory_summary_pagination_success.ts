import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_summary_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Call inventory summary with pagination parameters
  const request = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallProductVariant.IRequest;
  const summary =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert(summary);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    summary.pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit", summary.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records",
    summary.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages", summary.pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(summary.data));
  // 5. Validate each variant in the data array
  for (const variant of summary.data) {
    // Validate variant has required fields
    TestValidator.predicate("variant has id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has product",
      variant.product !== undefined,
    );
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant has option_values",
      variant.option_values !== undefined,
    );
    TestValidator.predicate(
      "variant has stock_quantity",
      typeof variant.stock_quantity === "number",
    );
    TestValidator.predicate(
      "variant has created_at",
      variant.created_at !== undefined,
    );
    // Validate stock_quantity is non-negative
    TestValidator.predicate(
      "stock_quantity non-negative",
      variant.stock_quantity >= 0,
    );
    // Validate product structure
    TestValidator.predicate("product has id", variant.product.id !== undefined);
    TestValidator.predicate(
      "product has name",
      variant.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has base_price",
      typeof variant.product.base_price === "number",
    );
    TestValidator.predicate(
      "product has seller",
      variant.product.seller !== undefined,
    );
    TestValidator.predicate(
      "product has category",
      variant.product.category !== undefined,
    );
    // Validate data isolation - seller ID matches authenticated seller
    TestValidator.equals(
      "variant belongs to authenticated seller",
      variant.product.seller.id,
      seller.id,
    );
  }
}
