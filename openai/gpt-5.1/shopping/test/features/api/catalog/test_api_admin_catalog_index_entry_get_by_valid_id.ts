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
 * Validate that an authenticated admin can fetch a catalog search index entry
 * by a valid id.
 *
 * Business context:
 *
 * - Admin tools need to inspect the catalog search index for diagnostics.
 * - This endpoint should return a complete, type-safe representation of a single
 *   index entry.
 *
 * Steps:
 *
 * 1. Create an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. List catalog index entries with a broad IRequest filter and small pageSize to
 *    get at least one summary.
 * 3. Extract the id from the first IShoppingMallCatalogSearchIndexEntry.ISummary
 *    in the page.
 * 4. Call GET
 *    /shoppingMall/admin/catalogSearch/indexEntries/{catalogSearchIndexEntryId}
 *    using that id.
 * 5. Assert that the response is a valid IShoppingMallCatalogSearchIndexEntry and
 *    that ids match.
 * 6. When product or sku is present, ensure they are structurally valid summaries
 *    (via typia.assert on those fields).
 */
export async function test_api_admin_catalog_index_entry_get_by_valid_id(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish Authorization header via SDK side effects
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. List catalog search index entries with a simple, broad filter
  const requestBody = {
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
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // Ensure we have at least one index entry to test with
  TestValidator.predicate(
    "admin catalog index entries list should contain at least one entry",
    pageResult.data.length > 0,
  );

  const summary: IShoppingMallCatalogSearchIndexEntry.ISummary =
    pageResult.data[0];
  typia.assert(summary);

  // 3. Call GET /shoppingMall/admin/catalogSearch/indexEntries/{catalogSearchIndexEntryId}
  const detail: IShoppingMallCatalogSearchIndexEntry =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.at(
      connection,
      {
        catalogSearchIndexEntryId: summary.id,
      },
    );
  typia.assert(detail);

  // 4. Cross-validate core identity fields
  TestValidator.equals(
    "detail id should match id from summary entry",
    detail.id,
    summary.id,
  );

  // 5. Basic business validations for required scalar fields
  TestValidator.predicate(
    "detail.locale should be non-empty string",
    detail.locale.length > 0,
  );
  TestValidator.predicate(
    "detail.search_text should be non-empty string",
    detail.search_text.length > 0,
  );

  // boost_score is a number by type; typia.assert already guarantees it, but
  // keep a simple sanity check for business logic (e.g., finite number)
  TestValidator.predicate(
    "detail.boost_score should be a finite number",
    Number.isFinite(detail.boost_score),
  );

  // 6. When product summary exists, validate structure and basic consistency
  if (detail.product !== undefined && detail.product !== null) {
    typia.assert<IShoppingMallProduct.ISummary>(detail.product);
  }

  // When sku summary exists, validate structure
  if (detail.sku !== undefined && detail.sku !== null) {
    typia.assert<IShoppingMallSku.ISummary>(detail.sku);
  }
}
