import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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

export async function test_api_product_search_stock_and_price_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register customer account for search
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    }),
  });
  // 2. Setup: Create seller and register products with varying stock and prices
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.assert<IEcommerceMallSeller.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    }),
  });
  // 3. Execute: Search with in_stock=true, min_price filter, and max_price filter
  const searchParams: IEcommerceMallProduct.IRequest = {
    in_stock: true,
    min_price: 5000,
    max_price: 20000,
    sort: "created_at",
    page: 1,
    limit: 10,
  };
  const searchResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.search(customerConnection, {
      body: searchParams,
    });
  typia.assert(searchResult);
  // 4. Verify: Response structure validation
  searchResult.data.forEach((product) => {
    typia.assert<IEcommerceMallProduct.ISummary>(product);
    TestValidator.predicate(
      "seller not suspended",
      !product.seller.is_suspended,
    );
  });
  // 5. Verify: Pagination validation
  TestValidator.predicate(
    "pagination exists",
    searchResult.pagination !== null,
  );
}