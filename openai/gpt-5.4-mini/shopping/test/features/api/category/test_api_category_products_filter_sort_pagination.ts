import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_category_products_filter_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const firstPage =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          search: RandomGenerator.alphabets(8),
          minPrice: 1000,
          maxPrice: 5000,
          inStockOnly: true,
          sort: "priceAsc",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (let index = 1; index < firstPage.data.length; index++) {
    TestValidator.predicate(
      "price ascending order",
      firstPage.data[index - 1].priceMin <= firstPage.data[index].priceMin,
    );
  }
  const emptyPage =
    await api.functional.mallPlatform.customer.categories.products.index(
      customerConnection,
      {
        categoryId,
        body: {
          search: RandomGenerator.alphabets(32),
          inStockOnly: true,
          sort: "newest",
          page: 1,
          limit: 5,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty page size within limit",
    emptyPage.data.length <= 5,
  );
  TestValidator.predicate(
    "empty page pagination is valid",
    emptyPage.pagination.records >= emptyPage.data.length &&
      emptyPage.pagination.pages >= 0,
  );
}
