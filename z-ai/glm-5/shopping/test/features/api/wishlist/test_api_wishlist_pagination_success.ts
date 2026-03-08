import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
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

export async function test_api_wishlist_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Test default pagination (no parameters)
  const defaultResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate default limit is 20
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 20);
  // Step 3: Test with explicit limit parameter
  const limitResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          limit: 5,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(limitResponse);
  TestValidator.equals(
    "custom limit applied",
    limitResponse.pagination.limit,
    5,
  );
  // Step 4: Test with explicit page parameter
  const pageResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page 1 requested", pageResponse.pagination.current, 1);
  // Step 5: Test sorting by created_at (default)
  const createdSortResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(createdSortResponse);
  // Step 6: Test sorting by price ascending
  const priceAscResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort: "price_asc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(priceAscResponse);
  // Step 7: Test sorting by price descending
  const priceDescResponse =
    await api.functional.shoppingMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          sort: "price_desc",
        } satisfies IShoppingMallWishlistItem.IRequest,
      },
    );
  typia.assert(priceDescResponse);
  // Step 8: Validate created_at DESC ordering for created_at sort
  if (createdSortResponse.data.length > 1) {
    for (let i = 0; i < createdSortResponse.data.length - 1; i++) {
      const current = new Date(
        createdSortResponse.data[i].created_at,
      ).getTime();
      const next = new Date(
        createdSortResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `items sorted by created_at DESC [${i}]`,
        current >= next,
      );
    }
  }
  // Step 9: Validate price ASC sorting
  if (priceAscResponse.data.length > 1) {
    for (let i = 0; i < priceAscResponse.data.length - 1; i++) {
      const current = priceAscResponse.data[i].product.min_price;
      const next = priceAscResponse.data[i + 1].product.min_price;
      TestValidator.predicate(
        `items sorted by price ASC [${i}]`,
        current <= next,
      );
    }
  }
  // Step 10: Validate price DESC sorting
  if (priceDescResponse.data.length > 1) {
    for (let i = 0; i < priceDescResponse.data.length - 1; i++) {
      const current = priceDescResponse.data[i].product.max_price;
      const next = priceDescResponse.data[i + 1].product.max_price;
      TestValidator.predicate(
        `items sorted by price DESC [${i}]`,
        current >= next,
      );
    }
  }
  // Step 11: Validate price range consistency for all items in default response
  for (const item of defaultResponse.data) {
    TestValidator.predicate(
      `price range valid for product ${item.product.id}`,
      item.product.min_price <= item.product.base_price &&
        item.product.base_price <= item.product.max_price,
    );
  }
}
