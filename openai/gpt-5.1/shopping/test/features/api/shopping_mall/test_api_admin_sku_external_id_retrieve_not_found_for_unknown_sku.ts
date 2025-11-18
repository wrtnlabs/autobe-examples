import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";

/**
 * Validate that admin retrieval of a SKU external identifier fails when the SKU
 * does not exist.
 *
 * Business context: Admin-facing integrations manage mappings between internal
 * SKUs and external system identifiers via the shopping_mall_sku_external_ids
 * table. When an admin requests a specific external ID for a SKU that does not
 * exist, the system must not pretend success or return a fabricated
 * IShoppingMallSkuExternalId. Instead, it should respond with a not-found style
 * error, which the SDK exposes as an HttpError.
 *
 * Step-by-step process:
 *
 * 1. Register an admin account via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This also attaches a valid Authorization
 *    token to the connection for subsequent calls.
 * 2. Construct a skuId value that is extremely unlikely to exist in the test
 *    database, using typia.random<string>(). The test intentionally does not
 *    create any SKU beforehand because the scenario is explicitly about an
 *    unknown SKU.
 * 3. Define a dummy skuExternalId string such as "DUMMY-EXTERNAL-ID".
 * 4. Use TestValidator.error with an async callback that calls
 *    api.functional.shoppingMall.admin.skus.externalIds.at(connection, { skuId,
 *    skuExternalId }). This asserts that the call fails (throws), instead of
 *    returning an IShoppingMallSkuExternalId.
 * 5. Do not inspect HTTP status codes or error bodies; simply rely on the fact
 *    that an HttpError is thrown to satisfy the not-found behavior
 *    requirement.
 */
export async function test_api_admin_sku_external_id_retrieve_not_found_for_unknown_sku(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Generate a skuId that should not exist
  const unknownSkuId: string = typia.random<string>();

  // 3. Prepare a dummy external identifier value
  const dummySkuExternalId = "DUMMY-EXTERNAL-ID";

  // 4. Assert that retrieving an external ID for an unknown SKU results in an error
  await TestValidator.error(
    "admin retrieving external ID for unknown SKU should fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.externalIds.at(connection, {
        skuId: unknownSkuId,
        skuExternalId: dummySkuExternalId,
      });
    },
  );
}
