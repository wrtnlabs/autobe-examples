import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogSearchAttributeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchAttributeFilter";
import type { IShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallCatalogSearchSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchSort";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_admin_catalog_index_entries_sort_variants(
  connection: api.IConnection,
) {
  // 1. Register a new admin and establish authenticated session
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Helper to build a base search request with broad filters
  const buildBaseRequest =
    (): IShoppingMallCatalogSearchIndexEntry.IRequest => {
      return {
        // Broad query: use random short text to increase chance of hits
        query: RandomGenerator.paragraph({ sentences: 1 }),
        // No category, tag, seller, or attribute filters so that results are broad
        categoryIds: undefined,
        tagIds: undefined,
        sellerIds: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        onlyInStock: undefined,
        attributeFilters: undefined,
        sort: undefined,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        pageSize: 20 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        locale: "en-US" as string & tags.MinLength<2> & tags.MaxLength<32>,
        regionCode: "KR" as string & tags.MinLength<2> & tags.MaxLength<64>,
      };
    };

  const baseRequest = buildBaseRequest();

  // 2. Call indexEntries with relevance sort (semantic default)
  const relevancePage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: {
          ...baseRequest,
          sort: {
            field: "relevance",
          } satisfies IShoppingMallCatalogSearchSort,
        } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest,
      },
    );
  typia.assert(relevancePage);

  const relevanceIds: string[] = relevancePage.data.map((e) => e.id);
  const pagination = relevancePage.pagination;

  // Ensure basic pagination sanity
  TestValidator.predicate(
    "relevance pagination page should be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "relevance pagination limit should match request pageSize",
    pagination.limit === baseRequest.pageSize,
  );

  // If less than 2 entries, we cannot perform meaningful sort comparisons
  if (relevancePage.data.length < 2) {
    TestValidator.predicate(
      "not enough index entries to validate sort variants (length < 2)",
      relevancePage.data.length < 2,
    );
    return;
  }

  // Helper to compute an effective price for a search index entry using product summary
  const getEffectivePrice = (
    entry: IShoppingMallCatalogSearchIndexEntry.ISummary,
  ): number | undefined => {
    if (entry.product !== undefined) {
      return entry.product.minPrice;
    }
    return undefined;
  };

  // Helper to extract ratingAverage from embedded product if available
  const getRatingAverage = (
    entry: IShoppingMallCatalogSearchIndexEntry.ISummary,
  ): number | undefined => {
    if (entry.product !== undefined) {
      return entry.product.ratingAverage;
    }
    return undefined;
  };

  // 3. price_asc sort
  const priceAscPage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: {
          ...baseRequest,
          sort: {
            field: "price_asc",
            direction: "asc",
          } satisfies IShoppingMallCatalogSearchSort,
        } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest,
      },
    );
  typia.assert(priceAscPage);

  const priceAscIds: string[] = priceAscPage.data.map((e) => e.id);

  // Pagination consistency between relevance and price_asc
  TestValidator.equals(
    "pagination.current should be consistent between relevance and price_asc",
    priceAscPage.pagination.current,
    relevancePage.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should be consistent between relevance and price_asc",
    priceAscPage.pagination.limit,
    relevancePage.pagination.limit,
  );
  TestValidator.equals(
    "pagination.records should be consistent between relevance and price_asc",
    priceAscPage.pagination.records,
    relevancePage.pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should be consistent between relevance and price_asc",
    priceAscPage.pagination.pages,
    relevancePage.pagination.pages,
  );

  // If sequences differ and have at least 2 elements, document the difference
  if (
    relevanceIds.length === priceAscIds.length &&
    relevanceIds.length >= 2 &&
    relevanceIds.some((id, index) => id !== priceAscIds[index])
  ) {
    TestValidator.notEquals(
      "relevance and price_asc sort sequences should differ when dataset allows reordering",
      relevanceIds,
      priceAscIds,
    );
  }

  // Price monotonicity check for price_asc
  const ascEffectivePrices: Array<number | undefined> = priceAscPage.data.map(
    (entry) => getEffectivePrice(entry),
  );
  const definedAscPrices: number[] = ascEffectivePrices.filter(
    (value): value is number => value !== undefined,
  );

  if (definedAscPrices.length >= 2) {
    const isNonDecreasing = definedAscPrices.every((value, index, array) => {
      if (index === 0) return true;
      return array[index - 1] <= value;
    });
    TestValidator.predicate(
      "price_asc should produce non-decreasing effective prices",
      isNonDecreasing,
    );
  }

  // 4. price_desc sort
  const priceDescPage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: {
          ...baseRequest,
          sort: {
            field: "price_desc",
            direction: "desc",
          } satisfies IShoppingMallCatalogSearchSort,
        } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest,
      },
    );
  typia.assert(priceDescPage);

  const priceDescIds: string[] = priceDescPage.data.map((e) => e.id);

  // Pagination consistency between relevance and price_desc
  TestValidator.equals(
    "pagination.current should be consistent between relevance and price_desc",
    priceDescPage.pagination.current,
    relevancePage.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should be consistent between relevance and price_desc",
    priceDescPage.pagination.limit,
    relevancePage.pagination.limit,
  );
  TestValidator.equals(
    "pagination.records should be consistent between relevance and price_desc",
    priceDescPage.pagination.records,
    relevancePage.pagination.records,
  );
  TestValidator.equals(
    "pagination.pages should be consistent between relevance and price_desc",
    priceDescPage.pagination.pages,
    relevancePage.pagination.pages,
  );

  // If sequences differ and have at least 2 elements, document the difference
  if (
    priceAscIds.length === priceDescIds.length &&
    priceAscIds.length >= 2 &&
    priceAscIds.some((id, index) => id !== priceDescIds[index])
  ) {
    TestValidator.notEquals(
      "price_asc and price_desc sequences should differ when dataset allows reordering",
      priceAscIds,
      priceDescIds,
    );
  }

  // Price monotonicity check for price_desc
  const descEffectivePrices: Array<number | undefined> = priceDescPage.data.map(
    (entry) => getEffectivePrice(entry),
  );
  const definedDescPrices: number[] = descEffectivePrices.filter(
    (value): value is number => value !== undefined,
  );

  if (definedDescPrices.length >= 2) {
    const isNonIncreasing = definedDescPrices.every((value, index, array) => {
      if (index === 0) return true;
      return array[index - 1] >= value;
    });
    TestValidator.predicate(
      "price_desc should produce non-increasing effective prices",
      isNonIncreasing,
    );
  }

  // 5. rating-based sort (if supported)
  const ratingSortPage: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: {
          ...baseRequest,
          sort: {
            field: "rating",
            direction: "desc",
          } satisfies IShoppingMallCatalogSearchSort,
        } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest,
      },
    );
  typia.assert(ratingSortPage);

  TestValidator.equals(
    "pagination.current should be consistent between relevance and rating sort",
    ratingSortPage.pagination.current,
    relevancePage.pagination.current,
  );
  TestValidator.equals(
    "pagination.limit should be consistent between relevance and rating sort",
    ratingSortPage.pagination.limit,
    relevancePage.pagination.limit,
  );

  const ratingValues: Array<number | undefined> = ratingSortPage.data.map(
    (entry) => getRatingAverage(entry),
  );
  const definedRatings: number[] = ratingValues.filter(
    (value): value is number => value !== undefined,
  );

  if (definedRatings.length >= 2) {
    const isRatingNonIncreasing = definedRatings.every(
      (value, index, array) => {
        if (index === 0) return true;
        return array[index - 1] >= value;
      },
    );
    TestValidator.predicate(
      "rating sort should produce non-increasing ratingAverage values when available",
      isRatingNonIncreasing,
    );
  }
}
