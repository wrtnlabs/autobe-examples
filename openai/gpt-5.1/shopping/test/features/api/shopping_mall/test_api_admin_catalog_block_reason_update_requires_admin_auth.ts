import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_update_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create an admin via /auth/admin/join to obtain an authenticated admin context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initial catalog block reason with the authenticated admin.
  const createBody = typia.random<IShoppingMallCatalogBlockReason.ICreate>();
  const originalReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(originalReason);

  // 3. Prepare an unauthenticated connection by cloning the existing connection
  //    but providing a fresh, empty headers object at creation time.
  const unauthenticatedConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Build a valid update payload for IShoppingMallCatalogBlockReason.IUpdate.
  const unauthUpdateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    severity_level: RandomGenerator.alphabets(5),
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  // 5. Attempt to update the catalog block reason using the unauthenticated connection
  //    and expect an authorization/authentication error.
  await TestValidator.error(
    "unauthenticated admin cannot update catalog block reason",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.update(
        unauthenticatedConn,
        {
          catalogBlockReasonId: originalReason.id,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 6. Prepare a second valid update payload to perform a successful update as the authenticated admin.
  const authUpdateBody = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: RandomGenerator.alphabets(6),
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  const updatedReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.update(
      connection,
      {
        catalogBlockReasonId: originalReason.id,
        body: authUpdateBody,
      },
    );
  typia.assert(updatedReason);

  // 7. Validate that the update succeeded and fields were changed as expected.
  TestValidator.equals(
    "updated reason ID should remain the same",
    updatedReason.id,
    originalReason.id,
  );
  TestValidator.equals(
    "updated code should match requested value",
    updatedReason.code,
    authUpdateBody.code,
  );
  TestValidator.equals(
    "updated name should match requested value",
    updatedReason.name,
    authUpdateBody.name,
  );
  TestValidator.equals(
    "updated severity_level should match requested value",
    updatedReason.severity_level,
    authUpdateBody.severity_level,
  );

  // And at least one field should differ from the original entity to confirm a real update happened.
  TestValidator.notEquals(
    "code should change after successful update",
    updatedReason.code,
    originalReason.code,
  );
}
