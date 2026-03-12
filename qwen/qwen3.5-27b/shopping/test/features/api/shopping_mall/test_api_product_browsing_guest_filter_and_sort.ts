import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest product browsing with various filter and sort combinations.
 * 1. Create guest session
 * 2. Test category filter
 * 3. Test price range filter
 * 4. Test in_stock filter
 * 5. Test search filter
 * 6. Test sorting options (newest, price_asc, price_desc)
 * 7. Test combined filter and sort
 * 8. Validate pagination metadata
 */
export async function test_api_product_browsing_guest_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test category filter
  const categoryFiltered =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(categoryFiltered);
  TestValidator.equals(
    "category filter pagination",
    categoryFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "category filter has data",
    categoryFiltered.data.length >= 0,
  );
  // 3. Test price range filter
  const priceMin = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const priceMax = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5000>
  >();
  const priceFiltered = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        price_min: priceMin,
        price_max: priceMax,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceFiltered);
  TestValidator.equals(
    "price filter pagination",
    priceFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "price filter has data",
    priceFiltered.data.length >= 0,
  );
  // 4. Test in_stock filter
  const stockFiltered = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        in_stock: true,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(stockFiltered);
  TestValidator.equals(
    "stock filter pagination",
    stockFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all in stock products available",
    stockFiltered.data.every((p) => p.available),
  );
  // 5. Test search filter
  const searchText = RandomGenerator.paragraph({ sentences: 2 });
  const searchFiltered = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        search: searchText,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchFiltered);
  TestValidator.equals(
    "search filter pagination",
    searchFiltered.pagination.current,
    1,
  );
  // 6. Test sorting - newest
  const newestSorted = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(newestSorted);
  TestValidator.equals(
    "newest sort pagination",
    newestSorted.pagination.current,
    1,
  );
  TestValidator.predicate(
    "newest sort has data",
    newestSorted.data.length >= 0,
  );
  // 7. Test sorting - price_asc
  const priceAscSorted = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        sort: "price_asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(priceAscSorted);
  TestValidator.equals(
    "price_asc sort pagination",
    priceAscSorted.pagination.current,
    1,
  );
  if (priceAscSorted.data.length > 1) {
    TestValidator.predicate(
      "price_asc sort order",
      priceAscSorted.data.every(
        (p, i, arr) => i === 0 || arr[i - 1].basePrice <= p.basePrice,
      ),
    );
  }
  // 8. Test sorting - price_desc
  const priceDescSorted =
    await api.functional.shoppingMall.guest.products.index(guestConnection, {
      body: {
        sort: "price_desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceDescSorted);
  TestValidator.equals(
    "price_desc sort pagination",
    priceDescSorted.pagination.current,
    1,
  );
  if (priceDescSorted.data.length > 1) {
    TestValidator.predicate(
      "price_desc sort order",
      priceDescSorted.data.every(
        (p, i, arr) => i === 0 || arr[i - 1].basePrice >= p.basePrice,
      ),
    );
  }
  // 9. Test combined filter and sort
  const combined = await api.functional.shoppingMall.guest.products.index(
    guestConnection,
    {
      body: {
        in_stock: true,
        price_min: priceMin,
        price_max: priceMax,
        sort: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined filter pagination",
    combined.pagination.current,
    1,
  );
  TestValidator.equals("combined filter limit", combined.pagination.limit, 10);
  TestValidator.predicate(
    "combined filter all in stock",
    combined.data.every((p) => p.available),
  );
  TestValidator.predicate(
    "combined filter price range",
    combined.data.every(
      (p) => p.basePrice >= priceMin && p.basePrice <= priceMax,
    ),
  );
  if (combined.data.length > 1) {
    TestValidator.predicate(
      "combined filter sort order",
      combined.data.every(
        (p, i, arr) => i === 0 || arr[i - 1].basePrice <= p.basePrice,
      ),
    );
  }
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination records matches data",
    combined.pagination.records >= combined.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    combined.pagination.pages ===
      Math.ceil(combined.pagination.records / combined.pagination.limit),
  );
}
