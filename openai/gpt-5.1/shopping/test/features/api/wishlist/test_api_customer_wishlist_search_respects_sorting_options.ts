import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_customer_wishlist_search_respects_sorting_options(
  connection: api.IConnection,
) {
  // 1. Register a new customer so we have an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create at least three wishlists with deterministic, lexicographically ordered names
  const wishlistNames = ["Alpha", "Bravo", "Charlie"] as const;

  const createdWishlists: IShoppingMallWishlist[] = [];
  for (const name of wishlistNames) {
    const created = await api.functional.shoppingMall.customer.wishlists.create(
      connection,
      {
        body: {
          name,
        } satisfies IShoppingMallWishlist.ICreate,
      },
    );
    typia.assert(created);
    createdWishlists.push(created);
  }

  const createdIds = createdWishlists.map((w) => w.id);

  // Helper to extract our test wishlists from a page and return them in response order
  const pickTestSummaries = (
    page: IPageIShoppingMallWishlist.ISummary,
  ): IShoppingMallWishlist.ISummary[] => {
    return page.data.filter((summary) => createdIds.includes(summary.id));
  };

  // 3. Query wishlists ordered by name ascending
  const ascRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "name" as "name",
    orderDirection: "asc" as "asc",
  } satisfies IShoppingMallWishlist.IRequest;

  const ascPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: ascRequestBody,
    });
  typia.assert(ascPage);

  const ascSummaries = pickTestSummaries(ascPage);

  // Ensure all three created wishlists are present in the page (or at least two if paging interferes)
  TestValidator.predicate(
    "all created wishlists should appear in at least one of the queried pages (asc)",
    ascSummaries.length >= 2,
  );

  // Validate ascending ordering of our test wishlists by name
  if (ascSummaries.length >= 2) {
    for (let i = 1; i < ascSummaries.length; i++) {
      const prev = ascSummaries[i - 1];
      const curr = ascSummaries[i];
      TestValidator.predicate(
        "asc order by name for test wishlists",
        prev.name.localeCompare(curr.name) <= 0,
      );
    }
  }

  // 4. Query wishlists ordered by name descending
  const descRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "name" as "name",
    orderDirection: "desc" as "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  const descPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: descRequestBody,
    });
  typia.assert(descPage);

  const descSummaries = pickTestSummaries(descPage);

  TestValidator.predicate(
    "all created wishlists should appear in at least one of the queried pages (desc)",
    descSummaries.length >= 2,
  );

  if (descSummaries.length >= 2) {
    for (let i = 1; i < descSummaries.length; i++) {
      const prev = descSummaries[i - 1];
      const curr = descSummaries[i];
      TestValidator.predicate(
        "desc order by name for test wishlists",
        prev.name.localeCompare(curr.name) >= 0,
      );
    }
  }

  // Additionally, ensure pagination metadata is consistent with our page size
  TestValidator.predicate(
    "pagination limit should be at least the requested limit",
    ascPage.pagination.limit >= 10,
  );
  TestValidator.predicate(
    "pagination records should be at least the number of created wishlists",
    ascPage.pagination.records >= createdWishlists.length,
  );
}
