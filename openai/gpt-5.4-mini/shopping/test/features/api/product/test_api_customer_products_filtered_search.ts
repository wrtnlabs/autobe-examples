import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_products_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const page = await api.functional.mallPlatform.customer.products.index(
    customerConnection,
    {
      body: {
        search: RandomGenerator.alphabets(8),
        minPrice: 0,
        maxPrice: 1000000,
        inStockOnly: true,
        sort: "newest",
        page: 1,
        limit: 10,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    page.data.length <= 10,
  );
  const emptyPage = await api.functional.mallPlatform.customer.products.index(
    customerConnection,
    {
      body: {
        search: `zzzzzz_${RandomGenerator.alphabets(12)}`,
        minPrice: 999999,
        maxPrice: 1000000,
        inStockOnly: true,
        sort: "priceAsc",
        page: 1,
        limit: 5,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty search returns no products",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty search returns no records",
    emptyPage.pagination.records,
    0,
  );
}
