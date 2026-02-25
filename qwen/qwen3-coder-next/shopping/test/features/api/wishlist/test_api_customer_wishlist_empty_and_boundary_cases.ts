import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_empty_and_boundary_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer account
  const customerCredentials: IShoppingMallCustomer.IJoin = {
    email: (typia.random<string & tags.Format<"email">>() ?? "") satisfies string as string,
    password: "12345678",
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorizedCustomer);
  // Test 1: Get empty wishlist with page: 1, limit: 10
  const emptyWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          pagination: {
            current: 1,
            limit: 10,
            records: 0,
            pages: 0,
          },
          data: [],
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyWishlist);
  // Validate empty wishlist metadata
  TestValidator.equals(
    "empty wishlist page info",
    emptyWishlist.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty wishlist limit",
    emptyWishlist.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty wishlist records",
    emptyWishlist.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty wishlist pages",
    emptyWishlist.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty wishlist data array",
    emptyWishlist.data.length,
    0,
  );
  // Test 2: Request page beyond available results (page: 999, limit: 20)
  const beyondWishlist =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          pagination: {
            current: 999,
            limit: 20,
            records: 0,
            pages: 0,
          },
          data: [],
          page: 999,
          limit: 20,
        },
      },
    );
  typia.assert(beyondWishlist);
  // Validate pagination metadata for out-of-range page
  TestValidator.equals(
    "beyond range page info",
    beyondWishlist.pagination.current,
    999,
  );
  TestValidator.equals(
    "beyond range limit",
    beyondWishlist.pagination.limit,
    20,
  );
  TestValidator.equals(
    "beyond range records",
    beyondWishlist.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond range pages",
    beyondWishlist.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond range data array",
    beyondWishlist.data.length,
    0,
  );
}