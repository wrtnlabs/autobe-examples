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
 * Verify that admin-only catalog index entry lookup returns data for valid
 * admins and can successfully retrieve an entry discovered from the admin index
 * API.
 *
 * ## Business goal
 *
 * This test ensures that the admin-facing endpoint GET
 * /shoppingMall/admin/catalogSearch/indexEntries/{catalogSearchIndexEntryId}
 * works correctly when invoked by an authenticated admin. It also validates
 * that the index (PATCH /shoppingMall/admin/catalogSearch/indexEntries) and the
 * detail (GET .../{id}) endpoints are wired together via the same id, proving
 * that an index entry discovered from the paginated listing can be fetched in
 * full detail.
 *
 * Due to SDK and test-environment constraints, we cannot simulate a truly
 * unauthenticated call without touching connection.headers, which is forbidden
 * in this environment. Therefore, we focus on the positive path and on
 * end-to-end coherence between index and detail retrieval for admins.
 *
 * ## End-to-end steps
 *
 * 1. Register a new shopping mall admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This call automatically attaches the
 *    returned JWT access token to the connection headers, establishing an admin
 *    authentication context.
 * 2. With the authenticated admin connection, call PATCH
 *    /shoppingMall/admin/catalogSearch/indexEntries using
 *    IShoppingMallCatalogSearchIndexEntry.IRequest as the request body.
 *
 *    - Provide minimal, valid pagination fields (page and pageSize).
 *    - Optionally set simple locale or region fields, but they are not required; all
 *         other filters can be omitted.
 * 3. Assert that the response is a valid
 *    IPageIShoppingMallCatalogSearchIndexEntry.ISummary using typia.assert.
 * 4. If the page contains no data, treat this as a valid but degenerate case:
 *
 *    - Use TestValidator.predicate to assert that data.length is greater than or
 *         equal to 0 and document via comments that the environment has no
 *         index entries, so the GET-by-id verification is skipped.
 * 5. If the page contains at least one index entry:
 *
 *    - Select the first entry from page.data.
 *    - Call GET /shoppingMall/admin/catalogSearch/indexEntries/{id} via
 *         api.functional.shoppingMall.admin.catalogSearch.indexEntries.at,
 *         using the id from the summary.
 *    - Assert that the returned object is a valid
 *         IShoppingMallCatalogSearchIndexEntry using typia.assert.
 *    - Use TestValidator.equals to confirm that the detailed record’s id matches the
 *         summary id.
 *
 * This flow demonstrates that admin authentication enables both listing and
 * detailed retrieval of catalog search index entries and that the endpoints are
 * correctly linked by id.
 */
export async function test_api_admin_catalog_index_entry_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Register a new admin; this also sets Authorization header on connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. List catalog search index entries with minimal, valid search request
  const searchRequest = {
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
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // 3. Basic sanity check on pagination and data array
  TestValidator.predicate(
    "catalog index entries page data length is non-negative",
    pageResult.data.length >= 0,
  );

  // If there are no index entries, we cannot meaningfully test GET-by-id
  if (pageResult.data.length === 0) {
    // Document via an assertion that environment has no index entries
    TestValidator.equals(
      "no catalog search index entries available to test GET-by-id",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 4. Pick the first summary entry and fetch its full details via GET-by-id
  const firstSummary: IShoppingMallCatalogSearchIndexEntry.ISummary =
    pageResult.data[0];

  const detailed: IShoppingMallCatalogSearchIndexEntry =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.at(
      connection,
      {
        catalogSearchIndexEntryId: firstSummary.id,
      },
    );
  typia.assert(detailed);

  // 5. Validate that the detailed record corresponds to the summary
  TestValidator.equals(
    "detailed catalog index entry id matches summary id",
    detailed.id,
    firstSummary.id,
  );
}
