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

export async function test_api_customer_products_browse_filter_boundaries(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const newestPage = await api.functional.mallPlatform.customer.products.index(
    customerConnection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 5,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(newestPage);
  TestValidator.equals("newest page current", newestPage.pagination.current, 1);
  TestValidator.equals("newest page limit", newestPage.pagination.limit, 5);
  TestValidator.predicate(
    "newest page records is non-negative",
    newestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "newest page pages is non-negative",
    newestPage.pagination.pages >= 0,
  );
  const minPrice = 1000;
  const maxPrice = 5000;
  const boundedPage = await api.functional.mallPlatform.customer.products.index(
    customerConnection,
    {
      body: {
        minPrice,
        maxPrice,
        sort: "priceAsc",
        page: 1,
        limit: 20,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(boundedPage);
  TestValidator.equals(
    "bounded page current",
    boundedPage.pagination.current,
    1,
  );
  TestValidator.equals("bounded page limit", boundedPage.pagination.limit, 20);
  TestValidator.predicate(
    "bounded page records is non-negative",
    boundedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "bounded page pages is non-negative",
    boundedPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "bounded page respects limit",
    boundedPage.data.length <= 20,
  );
  TestValidator.predicate(
    "bounded page prices are within inclusive range",
    boundedPage.data.every((product) => {
      const price = product.basePrice;
      return price >= minPrice && price <= maxPrice;
    }),
  );
  const descendingPage =
    await api.functional.mallPlatform.customer.products.index(
      customerConnection,
      {
        body: {
          minPrice,
          maxPrice,
          sort: "priceDesc",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(descendingPage);
  TestValidator.equals(
    "descending page current",
    descendingPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending page limit",
    descendingPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "descending page prices are sorted descending",
    descendingPage.data.every(
      (product, index, array) =>
        index === 0 || array[index - 1].basePrice >= product.basePrice,
    ),
  );
  TestValidator.equals(
    "bounded and descending page sizes match for same filter set",
    descendingPage.data.length,
    boundedPage.data.length,
  );
  TestValidator.predicate(
    "descending page prices remain in inclusive bounds",
    descendingPage.data.every((product) => {
      const price = product.basePrice;
      return price >= minPrice && price <= maxPrice;
    }),
  );
  const sortedAscPage =
    await api.functional.mallPlatform.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "priceAsc",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
  typia.assert(sortedAscPage);
  TestValidator.equals(
    "priceAsc page current",
    sortedAscPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "priceAsc page limit",
    sortedAscPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "priceAsc page prices are sorted ascending",
    sortedAscPage.data.every(
      (product, index, array) =>
        index === 0 || array[index - 1].basePrice <= product.basePrice,
    ),
  );
}
