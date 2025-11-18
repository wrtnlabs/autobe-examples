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
 * Verify that admin catalog search index listing respects locale and region
 * semantics and remains consistent when combined with additional filters.
 *
 * Business objectives:
 *
 * 1. Ensure that filtering by locale returns entries whose `locale` field matches
 *    exactly the requested locale (e.g., "en-US" or "ko-KR").
 * 2. Ensure that querying different locales produces distinguishable result sets
 *    when the index contains multiple languages.
 * 3. Ensure that omitting the locale still returns structurally valid results with
 *    a populated `locale` field for each entry.
 * 4. Ensure that adding additional filters (categoryIds, tagIds, etc.) does not
 *    break locale scoping for admin index listing.
 *
 * High level scenario:
 *
 * 1. Admin joins via POST /auth/admin/join to obtain an authenticated context.
 * 2. Call PATCH /shoppingMall/admin/catalogSearch/indexEntries with locale="en-US"
 *    and a regionCode, page=1, pageSize=10.
 * 3. Assert all entries in the page have locale === "en-US".
 * 4. Call the same endpoint with locale="ko-KR" (different locale).
 * 5. Assert all entries in the second page have locale === "ko-KR".
 * 6. When both result sets are non-empty, assert they are not identical overall
 *    (to confirm that localization actually changes the view).
 * 7. Call the endpoint without a locale field, keep other parameters.
 * 8. Assert the response structure and that each entry has a non-empty locale
 *    string.
 * 9. Perform another call with a specific locale plus extra filters (e.g.,
 *    categoryIds) and verify locale scoping is still respected.
 */
export async function test_api_admin_catalog_index_entries_filter_by_locale_and_region(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. First index call with locale="en-US" and a regionCode
  const regionCodeEn = "US";
  const requestEn = {
    page: 1,
    pageSize: 10,
    locale: "en-US",
    regionCode: regionCodeEn,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageEn: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: requestEn },
    );
  typia.assert(pageEn);

  for (const entry of pageEn.data) {
    TestValidator.equals(
      "locale must be en-US for admin index listing (en-US)",
      entry.locale,
      "en-US",
    );
  }

  // 3. Second index call with locale="ko-KR" and (optionally) different regionCode
  const regionCodeKo = "KR";
  const requestKo = {
    page: 1,
    pageSize: 10,
    locale: "ko-KR",
    regionCode: regionCodeKo,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageKo: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: requestKo },
    );
  typia.assert(pageKo);

  for (const entry of pageKo.data) {
    TestValidator.equals(
      "locale must be ko-KR for admin index listing (ko-KR)",
      entry.locale,
      "ko-KR",
    );
  }

  // 4. If both lists are non-empty, verify that they are not identical
  if (pageEn.data.length > 0 && pageKo.data.length > 0) {
    TestValidator.notEquals(
      "localized admin index results for en-US and ko-KR should differ when both non-empty",
      pageEn.data,
      pageKo.data,
    );
  }

  // 5. Third index call without locale (default locale behavior)
  const requestDefaultLocale = {
    page: 1,
    pageSize: 10,
    regionCode: regionCodeEn,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageDefault: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: requestDefaultLocale },
    );
  typia.assert(pageDefault);

  for (const entry of pageDefault.data) {
    TestValidator.predicate(
      "default-locale admin index entries must have non-empty locale",
      entry.locale.length > 0,
    );
  }

  // 6. Fourth call with locale + additional filters (e.g., categoryIds)
  const filteredCategoryIds = [
    typia.random<string & tags.Format<"uuid">>(),
  ] as (string & tags.Format<"uuid">)[];

  const requestEnWithFilters = {
    page: 1,
    pageSize: 10,
    locale: "en-US",
    regionCode: regionCodeEn,
    categoryIds: filteredCategoryIds,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageEnWithFilters: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      { body: requestEnWithFilters },
    );
  typia.assert(pageEnWithFilters);

  for (const entry of pageEnWithFilters.data) {
    TestValidator.equals(
      "locale must remain en-US when additional filters are applied",
      entry.locale,
      "en-US",
    );
  }

  // Basic pagination sanity checks aligned with requested page=1
  TestValidator.equals("pageEn current page", pageEn.pagination.current, 1);
  TestValidator.equals("pageKo current page", pageKo.pagination.current, 1);
  TestValidator.equals(
    "pageDefault current page",
    pageDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "pageEnWithFilters current page",
    pageEnWithFilters.pagination.current,
    1,
  );
}
