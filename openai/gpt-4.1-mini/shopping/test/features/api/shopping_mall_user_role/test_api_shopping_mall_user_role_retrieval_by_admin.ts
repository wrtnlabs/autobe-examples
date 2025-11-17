import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_shopping_mall_user_role_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@test.com` satisfies string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(authorizedAdmin);

  // 2. Create an administrator user
  const adminCreateBody = {
    email:
      `admin_user${RandomGenerator.alphaNumeric(6)}@test.com` satisfies string &
        tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // 3. Create a shopping mall role
  const roleCreateBody = {
    name: `role_${RandomGenerator.alphaNumeric(6)}`,
    label: `Role Label ${RandomGenerator.alphaNumeric(4)}`,
    description: null,
  } satisfies IShoppingMallRole.ICreate;

  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      { body: roleCreateBody },
    );
  typia.assert(createdRole);

  // 4. Create user role association
  const userRoleCreateBody = {
    shopping_mall_user_id: createdAdmin.id,
    shopping_mall_role_id: createdRole.id,
  } satisfies IShoppingMallUserRole.ICreate;

  const createdUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.shoppingMallUserRoles.create(
      connection,
      { body: userRoleCreateBody },
    );
  typia.assert(createdUserRole);

  // 5. Retrieve the user role association by ID
  const retrievedUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.shoppingMallUserRoles.at(
      connection,
      { shoppingMallUserRoleId: createdUserRole.id },
    );
  typia.assert(retrievedUserRole);

  // Verifications
  TestValidator.equals(
    "retrieved user role ID matches created",
    retrievedUserRole.id,
    createdUserRole.id,
  );

  TestValidator.equals(
    "retrieved user role admin ID matches created admin",
    retrievedUserRole.shopping_mall_admin_id,
    createdAdmin.id,
  );

  TestValidator.equals(
    "retrieved user role role ID matches created role",
    retrievedUserRole.shopping_mall_role_id,
    createdRole.id,
  );

  TestValidator.predicate(
    "created_at is ISO 8601 string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      retrievedUserRole.created_at,
    ),
  );

  TestValidator.predicate(
    "deleted_at is null or ISO 8601 string",
    retrievedUserRole.deleted_at === null ||
      typeof retrievedUserRole.deleted_at === "string",
  );
}
