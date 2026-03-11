import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // 2. Test default pagination (page=1, limit=20)
  const defaultPage =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("default page count", defaultPage.data.length, 0);
  TestValidator.equals(
    "pagination: current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination: limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "pagination: records",
    defaultPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination: pages", defaultPage.pagination.pages, 0);
  // 3. Test with different pagination parameters
  const limitedPage =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals("limited page count", limitedPage.data.length, 0);
  TestValidator.equals("limited page limit", limitedPage.pagination.limit, 5);
  // 4. Test search parameter
  const searchPage = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        search: "test",
        limit: 50,
      },
    },
  );
  typia.assert(searchPage);
  // 5. Test is_available filter
  const availablePage =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          is_available: true,
          limit: 50,
        },
      },
    );
  typia.assert(availablePage);
  // 6. Test price range filter
  const pricePage = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        min_price: 0,
        max_price: 1000000,
        limit: 50,
      },
    },
  );
  typia.assert(pricePage);
  // 7. Test sorting by created_at descending
  const sortedPage = await api.functional.ecommerceMall.customer.wishlist.index(
    customerConnection,
    {
      body: {
        sort_field: "created_at",
        sort_order: "desc",
      },
    },
  );
  typia.assert(sortedPage);
  // 8. Test sorting by base_price ascending
  const priceSorted =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          sort_field: "base_price",
          sort_order: "asc",
        },
      },
    );
  typia.assert(priceSorted);
  // 9. Test privacy isolation - another customer has empty wishlist
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(anotherCustomerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  const anotherCustomerResult =
    await api.functional.ecommerceMall.customer.wishlist.index(
      anotherCustomerConnection,
      {
        body: {
          limit: 50,
        },
      },
    );
  typia.assert(anotherCustomerResult);
  TestValidator.equals(
    "another customer has empty wishlist",
    anotherCustomerResult.data.length,
    0,
  );
}
