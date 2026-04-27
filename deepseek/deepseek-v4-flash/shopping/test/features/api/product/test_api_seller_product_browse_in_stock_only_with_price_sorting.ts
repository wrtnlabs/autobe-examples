import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_browse_in_stock_only_with_price_sorting(
  connection: api.IConnection,
): Promise<void> {
  // ----
  // PREPARE SELLER
  // ----
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ----
  // 1. inStockOnly=true, sort='price_asc'
  // ----
  const ascResult: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.seller.products.index(sellerConnection, {
      body: {
        inStockOnly: true,
        sort: "price_asc",
        limit: 20,
      } satisfies IECommerceMallProduct.IRequest,
    });
  typia.assert(ascResult);
  // Validate pagination
  TestValidator.predicate(
    "pagination.current is positive integer",
    Number.isInteger(ascResult.pagination.current) &&
      ascResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    typeof ascResult.pagination.limit === "number" &&
      ascResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(ascResult.pagination.records) &&
      ascResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative integer",
    Number.isInteger(ascResult.pagination.pages) &&
      ascResult.pagination.pages >= 0,
  );
  // Validate all products have visibility = 'visible'
  for (const product of ascResult.data) {
    TestValidator.equals(
      `product[${ascResult.data.indexOf(product)}] visibility`,
      product.visibility,
      "visible",
    );
  }
  // Validate ascending price order
  if (ascResult.data.length > 1) {
    for (let i: number = 1; i < ascResult.data.length; i++) {
      TestValidator.predicate(
        `price ascending order at index ${i}`,
        ascResult.data[i - 1].base_price <= ascResult.data[i].base_price,
      );
    }
  }
  // ----
  // 2. inStockOnly=true, sort='price_desc'
  // ----
  const descResult: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.seller.products.index(sellerConnection, {
      body: {
        inStockOnly: true,
        sort: "price_desc",
        limit: 20,
      } satisfies IECommerceMallProduct.IRequest,
    });
  typia.assert(descResult);
  // Validate descending price order
  if (descResult.data.length > 1) {
    for (let i: number = 1; i < descResult.data.length; i++) {
      TestValidator.predicate(
        `price descending order at index ${i}`,
        descResult.data[i - 1].base_price >= descResult.data[i].base_price,
      );
    }
  }
  // ----
  // 3. inStockOnly=false (should include both in-stock and out-of-stock)
  // ----
  const allResult: IPageIECommerceMallProduct.ISummary =
    await api.functional.eCommerceMall.seller.products.index(sellerConnection, {
      body: {
        inStockOnly: false,
        sort: "price_asc",
        limit: 20,
      } satisfies IECommerceMallProduct.IRequest,
    });
  typia.assert(allResult);
  // All products should still have visibility='visible' (API handles this)
  for (const product of allResult.data) {
    TestValidator.equals(
      `all-result product[${allResult.data.indexOf(product)}] visibility`,
      product.visibility,
      "visible",
    );
  }
}
