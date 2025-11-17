import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_shopping_mall_user_role_creation_by_admin(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        ip: null,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/home",
      },
    });
  typia.assert(adminAuthorized);

  // Create shopping mall admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
  } satisfies IShoppingMallAdmin.ICreate;

  const shoppingMallAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: adminCreateBody,
      },
    );
  typia.assert(shoppingMallAdmin);

  // Create shopping mall role
  const roleCreateBody = {
    name: RandomGenerator.alphabets(8),
    label: RandomGenerator.name(2),
    description: null,
  } satisfies IShoppingMallRole.ICreate;

  const shoppingMallRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(shoppingMallRole);

  // Create user role association linking admin and role
  const userRoleCreateBody = {
    shopping_mall_user_id: shoppingMallAdmin.id,
    shopping_mall_role_id: shoppingMallRole.id,
  } satisfies IShoppingMallUserRole.ICreate;

  const shoppingMallUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.shoppingMallUserRoles.create(
      connection,
      {
        body: userRoleCreateBody,
      },
    );
  typia.assert(shoppingMallUserRole);

  // Validate returned IDs and timestamps are non-empty and properly formatted
  TestValidator.predicate(
    "userRole.id is a valid uuid",
    typeof shoppingMallUserRole.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        shoppingMallUserRole.id,
      ),
  );
  TestValidator.equals(
    "userRole admin id matches",
    shoppingMallUserRole.shopping_mall_admin_id,
    shoppingMallAdmin.id,
  );
  TestValidator.equals(
    "userRole role id matches",
    shoppingMallUserRole.shopping_mall_role_id,
    shoppingMallRole.id,
  );
  TestValidator.predicate(
    "userRole created_at is ISO 8601 string",
    typeof shoppingMallUserRole.created_at === "string" &&
      !isNaN(Date.parse(shoppingMallUserRole.created_at)),
  );
  TestValidator.predicate(
    "userRole deleted_at is null or undefined",
    shoppingMallUserRole.deleted_at === null ||
      shoppingMallUserRole.deleted_at === undefined,
  );
}
