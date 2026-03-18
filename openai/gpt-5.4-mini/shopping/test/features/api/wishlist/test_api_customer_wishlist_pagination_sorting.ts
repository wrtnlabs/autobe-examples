import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: `wishlist-${typia.random<string & tags.Format<"email">>()}`,
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const pageSize = 5;
  const newestPage = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: pageSize,
        sort: "newest",
      } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(newestPage);
  TestValidator.equals(
    "wishlist newest page current",
    newestPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "wishlist newest page limit",
    newestPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "wishlist newest page records non-negative",
    newestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist newest page pages non-negative",
    newestPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "wishlist newest page data within limit",
    newestPage.data.length <= pageSize,
  );
  const repeatedNewestPage =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: pageSize,
          sort: "newest",
        } satisfies IShoppingMallWishlist.IRequest,
      },
    );
  typia.assert(repeatedNewestPage);
  TestValidator.equals(
    "wishlist repeated newest page stable",
    repeatedNewestPage,
    newestPage,
  );
  const oldestPage = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: pageSize,
        sort: "oldest",
      } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(oldestPage);
  TestValidator.equals(
    "wishlist oldest page current",
    oldestPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "wishlist oldest page limit",
    oldestPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "wishlist oldest page records",
    oldestPage.pagination.records,
    newestPage.pagination.records,
  );
  TestValidator.equals(
    "wishlist oldest page pages",
    oldestPage.pagination.pages,
    newestPage.pagination.pages,
  );
  TestValidator.predicate(
    "wishlist oldest page data within limit",
    oldestPage.data.length <= pageSize,
  );
  const newestIds = newestPage.data.map((item) => item.id);
  const oldestIds = oldestPage.data.map((item) => item.id);
  TestValidator.equals(
    "wishlist sort orders preserve same ids as sets",
    [...newestIds].sort(),
    [...oldestIds].sort(),
  );
}
