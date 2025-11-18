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

export async function test_api_admin_catalog_index_entries_pagination_and_empty_results(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Broad catalog indexEntries query - page 1
  const pageSize = 20 as const;

  const broadRequestPage1 = {
    page: 1,
    pageSize,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const page1 =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: broadRequestPage1,
      },
    );
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Basic pagination assertions for page 1
  TestValidator.equals("page 1 current should be 1", pagination1.current, 1);
  TestValidator.equals(
    "page 1 limit should equal requested pageSize",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records should be greater than or equal to data length on page 1",
    pagination1.records >= data1.length,
  );
  TestValidator.predicate(
    "pages should be at least 0 or 1 depending on records",
    pagination1.pages >= (pagination1.records === 0 ? 0 : 1),
  );

  // 3. Conditional second page query (only when multiple pages exist)
  if (pagination1.records > pageSize) {
    const broadRequestPage2 = {
      page: 2,
      pageSize,
    } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

    const page2 =
      await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
        connection,
        {
          body: broadRequestPage2,
        },
      );
    typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(page2);

    const pagination2 = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals(
      "page 2 current should be 2 when records exceed first page size",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should equal requested pageSize",
      pagination2.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records should be consistent between page 1 and page 2",
      pagination2.records,
      pagination1.records,
    );
    TestValidator.equals(
      "total pages should be consistent between page 1 and page 2",
      pagination2.pages,
      pagination1.pages,
    );

    if (data1.length > 0 && data2.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 data slices should not be deeply equal when both have data",
        data1,
        data2,
      );
    }
  }

  // 4. Restrictive query expected to yield no results
  const restrictiveQuery = RandomGenerator.alphaNumeric(32);

  const restrictiveRequestPage1 = {
    query: restrictiveQuery,
    page: 1,
    pageSize,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const emptyPage =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: restrictiveRequestPage1,
      },
    );
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(emptyPage);

  const paginationEmpty = emptyPage.pagination;
  const dataEmpty = emptyPage.data;

  TestValidator.equals(
    "empty-result page current should be 1",
    paginationEmpty.current,
    1,
  );
  TestValidator.equals(
    "empty-result page limit should equal requested pageSize",
    paginationEmpty.limit,
    pageSize,
  );
  TestValidator.equals(
    "empty-result records should be 0",
    paginationEmpty.records,
    0,
  );
  TestValidator.predicate(
    "empty-result pages should be either 0 or 1",
    paginationEmpty.pages === 0 || paginationEmpty.pages === 1,
  );
  TestValidator.equals(
    "empty-result data array should be empty",
    dataEmpty.length,
    0,
  );
}
