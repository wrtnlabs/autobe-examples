import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuExternalId";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";

export async function test_api_admin_sku_external_ids_search_nonexistent_sku_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authorized context
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a clearly invalid SKU ID (random UUID not backed by any SKU row)
  const invalidSkuId1 = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct a valid, neutral external ID search request body
  const searchRequestBody = {
    system_code: null,
    external_id: null,
    page: null,
    limit: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallSkuExternalId.IRequest;

  // 4. Call externalIds.index with the invalid SKU ID and expect an error
  await TestValidator.error(
    "searching external IDs for a non-existent SKU should raise an error",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.index(
        connection,
        {
          skuId: invalidSkuId1,
          body: searchRequestBody,
        },
      );
    },
  );

  // 5. Optionally repeat with another invalid SKU ID to ensure consistent behavior
  const invalidSkuId2 = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "searching external IDs for another non-existent SKU should also raise an error",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.index(
        connection,
        {
          skuId: invalidSkuId2,
          body: searchRequestBody,
        },
      );
    },
  );
}
