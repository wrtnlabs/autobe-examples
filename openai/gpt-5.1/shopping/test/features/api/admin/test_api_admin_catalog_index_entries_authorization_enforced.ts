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

export async function test_api_admin_catalog_index_entries_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Build a minimal valid catalog search index request body.
  const baseRequest: IShoppingMallCatalogSearchIndexEntry.IRequest =
    typia.random<IShoppingMallCatalogSearchIndexEntry.IRequest>();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const requestBody: IShoppingMallCatalogSearchIndexEntry.IRequest = {
    ...baseRequest,
    page,
    pageSize,
  };

  // 2. Create an unauthenticated connection by clearing headers.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3-4. Call admin-only endpoint without Authorization and expect HTTP 401/403.
  await TestValidator.httpError(
    "unauthenticated access to admin catalog index must be rejected",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
        unauthenticated,
        {
          body: requestBody,
        },
      );
    },
  );

  // 5. Register a new admin; this also issues a token and mutates `connection.headers.Authorization`.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 6. Call the admin-only endpoint again with authenticated connection.
  const pageResult: IPageIShoppingMallCatalogSearchIndexEntry.ISummary =
    await api.functional.shoppingMall.admin.catalogSearch.indexEntries.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 7-8. Basic pagination business assertions.
  TestValidator.equals(
    "pagination.current must equal requested page when records exist",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit must equal requested pageSize when records exist",
    pageResult.pagination.limit,
    pageSize,
  );
}
