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

/**
 * Verify that an authenticated admin can search catalog index entries with
 * free-text query and multiple filters, and receive a valid paginated response
 * whose structure matches IPageIShoppingMallCatalogSearchIndexEntry.ISummary.
 *
 * Business flow:
 *
 * 1. Join a fresh admin via POST /auth/admin/join.
 * 2. Call PATCH /shoppingMall/admin/catalogSearch/indexEntries with a rich
 *    IShoppingMallCatalogSearchIndexEntry.IRequest including:
 *
 *    - Non-empty text query
 *    - Price range (minPrice/maxPrice)
 *    - OnlyInStock=true
 *    - At least one attributeFilters entry
 *    - Sort configuration and pagination (page/pageSize)
 * 3. Validate pagination metadata and that data length does not exceed pageSize.
 * 4. For each returned index entry, verify core fields (locale, search_text,
 *    boost_score, created_at, updated_at) are populated and that any attached
 *    product/sku summaries have basic fields populated.
 * 5. Perform a second call with loosened filters to ensure the endpoint behaves
 *    consistently under multiple queries.
 */
export async function test_api_admin_catalog_index_entries_search_by_text_and_filters(
  connection: api.IConnection,
) {
  // 1. Admin join (fresh admin context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a rich search request for indexEntries
  const basePrice = typia.random<number & tags.Minimum<0>>();
  const priceDelta = typia.random<number & tags.Minimum<0>>();
  const minPrice = basePrice;
  const maxPrice = basePrice + priceDelta;

  const attributeFilter = {
    attributeKey: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 12,
    }),
    attributeValueIds: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IShoppingMallCatalogSearchAttributeFilter;

  const sort = {
    field: "price_asc",
    direction: "asc",
  } satisfies IShoppingMallCatalogSearchSort;

  const pageSize = 20;

  const requestBody = {
    query: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 12,
    }),
    // Use only sellerIds as a sample filter to keep cardinality lower.
    sellerIds: [typia.random<string & tags.Format<"uuid">>()],
    minPrice,
    maxPrice,
    onlyInStock: true,
    attributeFilters: [attributeFilter],
    sort,
    page: 1,
    pageSize,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  // 3. Call indexEntries with the constructed request body
  const firstPage =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // 4. Validate pagination metadata and bounds
  TestValidator.equals(
    "pagination.current should match requested page (1)",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match requested pageSize",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination.records should be >= number of returned records",
    pagination1.records >= data1.length,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1",
    pagination1.pages >= 1,
  );
  TestValidator.predicate(
    "data length should be <= pageSize",
    data1.length <= pageSize,
  );

  // 5. Validate core fields for each index entry when there are results
  for (const entry of data1) {
    // locale should be non-empty
    TestValidator.predicate(
      "index entry locale should be non-empty",
      entry.locale.length > 0,
    );
    // search_text should be non-empty
    TestValidator.predicate(
      "index entry search_text should be non-empty",
      entry.search_text.length > 0,
    );
    // created_at and updated_at should be non-empty strings
    TestValidator.predicate(
      "index entry created_at should be non-empty",
      entry.created_at.length > 0,
    );
    TestValidator.predicate(
      "index entry updated_at should be non-empty",
      entry.updated_at.length > 0,
    );

    // product summary checks when present
    if (entry.product !== undefined) {
      TestValidator.predicate(
        "product summary name should be non-empty when present",
        entry.product.name.length > 0,
      );
      TestValidator.predicate(
        "product summary minPrice should be >= 0",
        entry.product.minPrice >= 0,
      );
      TestValidator.predicate(
        "product summary maxPrice should be >= minPrice",
        entry.product.maxPrice >= entry.product.minPrice,
      );
    }

    // sku summary checks when present
    if (entry.sku !== undefined) {
      TestValidator.predicate(
        "sku summary code should be non-empty when present",
        entry.sku.code.length > 0,
      );
      TestValidator.predicate(
        "sku summary name should be non-empty when present",
        entry.sku.name.length > 0,
      );
    }
  }

  // 6. Second call with slightly different query / filters to ensure
  // endpoint works with alternate payloads as well.
  const relaxedRequestBody = {
    query: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 12,
    }),
    // Relax filters: omit sellerIds and attributeFilters, keep price range and stock flag.
    minPrice,
    maxPrice,
    onlyInStock: true,
    page: 1,
    pageSize,
    locale: "en-US",
    regionCode: "KR",
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const secondPage =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: relaxedRequestBody },
    );
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(secondPage);

  const pagination2 = secondPage.pagination;
  const data2 = secondPage.data;

  TestValidator.equals(
    "second call pagination.current should be 1",
    pagination2.current,
    1,
  );
  TestValidator.equals(
    "second call pagination.limit should match pageSize",
    pagination2.limit,
    pageSize,
  );
  TestValidator.predicate(
    "second call records should be >= data length",
    pagination2.records >= data2.length,
  );
  TestValidator.predicate(
    "second call pages should be >= 1",
    pagination2.pages >= 1,
  );
  TestValidator.predicate(
    "second call data length should be <= pageSize",
    data2.length <= pageSize,
  );
}
