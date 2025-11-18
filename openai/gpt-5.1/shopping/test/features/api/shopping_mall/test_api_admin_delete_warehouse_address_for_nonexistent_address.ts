import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

/**
 * Validate admin deletion of a non-existent warehouse address.
 *
 * Business goals:
 *
 * - Ensure that when an admin attempts to delete an address for an existing
 *   seller warehouse that has no address row yet, the API responds with an
 *   error instead of succeeding silently.
 * - Ensure this failed delete has no destructive side effects on the seller or
 *   warehouse subsystem so that later operations still work.
 *
 * Steps:
 *
 * 1. Seller self-registers via /auth/seller/join.
 * 2. Seller logs in via /auth/seller/login.
 * 3. Seller creates a new warehouse via /shoppingMall/seller/sellerWarehouses. (We
 *    never create any address for this warehouse.)
 * 4. Admin self-registers via /auth/admin/join (implicitly authenticated).
 * 5. As the admin, call DELETE
 *    /shoppingMall/admin/sellerWarehouses/{warehouseId}/address for the
 *    warehouse created in step 3 and assert that the call fails with an error
 *    because the address does not exist.
 * 6. After the failed delete, log in again as the original seller to confirm that
 *    authentication and seller operations still work, then create another
 *    warehouse to ensure the seller/warehouse subsystem remains functional.
 */
export async function test_api_admin_delete_warehouse_address_for_nonexistent_address(
  connection: api.IConnection,
) {
  // 1. Seller self-registers
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(joinedSeller);

  // 2. Seller logs in explicitly (verifies credentials and refreshes token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  // 3. Seller creates a warehouse with no address
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert(warehouse);

  TestValidator.predicate(
    "created warehouse should have a non-empty id",
    typeof warehouse.id === "string" && warehouse.id.length > 0,
  );

  // 4. Admin self-registers (implicit login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 5. As admin, attempt to delete address for warehouse without address
  await TestValidator.error(
    "deleting non-existent warehouse address as admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerWarehouses.address.erase(
        connection,
        {
          warehouseId: warehouse.id,
        },
      );
    },
  );

  // 6. Ensure seller and warehouse subsystem still works after failed delete
  const sellerLoginAfterDeleteBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterDelete: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginAfterDeleteBody,
    });
  typia.assert(sellerAfterDelete);

  const secondWarehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const secondWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: secondWarehouseCreateBody,
      },
    );
  typia.assert(secondWarehouse);

  TestValidator.predicate(
    "second warehouse creation after failed admin delete should succeed",
    typeof secondWarehouse.id === "string" && secondWarehouse.id.length > 0,
  );
}
