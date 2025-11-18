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

export async function test_api_admin_catalog_index_entry_consistency_with_list_view(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization token (auto-applied to connection)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Query index entries with simple deterministic pagination
  const indexRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallCatalogSearchIndexEntry.IRequest;

  const pageResult: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: indexRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallCatalogSearchIndexEntry.ISummary>(pageResult);
  typia.assert<IPage.IPagination>(pageResult.pagination);

  // If there are no index entries, assert pagination consistency and exit early
  if (pageResult.data.length === 0) {
    TestValidator.equals(
      "empty catalog index should report zero records",
      pageResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty catalog index should have zero data length",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 3. Pick first summary entry for comparison
  const summary: IShoppingMallCatalogSearchIndexEntry.ISummary =
    pageResult.data[0];
  typia.assert<IShoppingMallCatalogSearchIndexEntry.ISummary>(summary);

  // 4. Fetch detail entry by id
  const detail: IShoppingMallCatalogSearchIndexEntry =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.at(
      connection,
      {
        catalogSearchIndexEntryId: summary.id,
      },
    );
  typia.assert<IShoppingMallCatalogSearchIndexEntry>(detail);

  // 5. Core field consistency checks
  TestValidator.equals("detail id equals summary id", detail.id, summary.id);

  TestValidator.equals(
    "detail locale equals summary locale",
    detail.locale,
    summary.locale,
  );

  TestValidator.equals(
    "detail search_text equals summary search_text",
    detail.search_text,
    summary.search_text,
  );

  TestValidator.equals(
    "detail boost_score equals summary boost_score",
    detail.boost_score,
    summary.boost_score,
  );

  TestValidator.equals(
    "detail created_at equals summary created_at",
    detail.created_at,
    summary.created_at,
  );

  TestValidator.equals(
    "detail updated_at equals summary updated_at",
    detail.updated_at,
    summary.updated_at,
  );

  // 6. Product consistency
  if (summary.product !== undefined) {
    if (summary.product === null) {
      TestValidator.predicate(
        "when summary.product is null, detail.product should be null or undefined",
        detail.product === null || detail.product === undefined,
      );
    } else {
      // summary.product is defined and non-null
      TestValidator.predicate(
        "when summary.product is present, detail.product should be present",
        detail.product !== null && detail.product !== undefined,
      );
      if (detail.product !== null && detail.product !== undefined) {
        const detailProduct: IShoppingMallProduct.ISummary = detail.product;
        const summaryProduct: IShoppingMallProduct.ISummary = summary.product;

        TestValidator.equals(
          "product id matches between summary and detail",
          detailProduct.id,
          summaryProduct.id,
        );
        TestValidator.equals(
          "product name matches between summary and detail",
          detailProduct.name,
          summaryProduct.name,
        );
        TestValidator.equals(
          "product minPrice matches between summary and detail",
          detailProduct.minPrice,
          summaryProduct.minPrice,
        );
        TestValidator.equals(
          "product maxPrice matches between summary and detail",
          detailProduct.maxPrice,
          summaryProduct.maxPrice,
        );
        TestValidator.equals(
          "product currency matches between summary and detail",
          detailProduct.currency,
          summaryProduct.currency,
        );

        // primaryCategoryName, ratingAverage, ratingCount, isVisible may be
        // optional, but when both defined we still expect them to match.
        if (
          detailProduct.primaryCategoryName !== undefined &&
          summaryProduct.primaryCategoryName !== undefined
        ) {
          TestValidator.equals(
            "product primaryCategoryName matches when both are defined",
            detailProduct.primaryCategoryName,
            summaryProduct.primaryCategoryName,
          );
        }
        if (
          detailProduct.ratingAverage !== undefined &&
          summaryProduct.ratingAverage !== undefined
        ) {
          TestValidator.equals(
            "product ratingAverage matches when both are defined",
            detailProduct.ratingAverage,
            summaryProduct.ratingAverage,
          );
        }
        if (
          detailProduct.ratingCount !== undefined &&
          summaryProduct.ratingCount !== undefined
        ) {
          TestValidator.equals(
            "product ratingCount matches when both are defined",
            detailProduct.ratingCount,
            summaryProduct.ratingCount,
          );
        }
        TestValidator.equals(
          "product isVisible matches between summary and detail",
          detailProduct.isVisible,
          summaryProduct.isVisible,
        );
      }
    }
  } else {
    TestValidator.predicate(
      "when summary.product is undefined, detail.product should be null or undefined",
      detail.product === null || detail.product === undefined,
    );
  }

  // 7. SKU consistency
  if (summary.sku !== undefined) {
    if (summary.sku === null) {
      TestValidator.predicate(
        "when summary.sku is null, detail.sku should be null or undefined",
        detail.sku === null || detail.sku === undefined,
      );
    } else {
      // summary.sku is defined and non-null
      TestValidator.predicate(
        "when summary.sku is present, detail.sku should be present",
        detail.sku !== null && detail.sku !== undefined,
      );
      if (detail.sku !== null && detail.sku !== undefined) {
        const detailSku: IShoppingMallSku.ISummary = detail.sku;
        const summarySku: IShoppingMallSku.ISummary = summary.sku;

        TestValidator.equals(
          "sku id matches between summary and detail",
          detailSku.id,
          summarySku.id,
        );
        TestValidator.equals(
          "sku code matches between summary and detail",
          detailSku.code,
          summarySku.code,
        );
        TestValidator.equals(
          "sku name matches between summary and detail",
          detailSku.name,
          summarySku.name,
        );
      }
    }
  } else {
    TestValidator.predicate(
      "when summary.sku is undefined, detail.sku should be null or undefined",
      detail.sku === null || detail.sku === undefined,
    );
  }
}
