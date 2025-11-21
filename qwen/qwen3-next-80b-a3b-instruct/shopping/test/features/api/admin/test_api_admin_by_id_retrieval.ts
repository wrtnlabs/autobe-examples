import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_by_id_retrieval(
  connection: api.IConnection,
) {
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  const retrievedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.at(connection, {
      adminId: admin.id,
    });
  typia.assert(retrievedAdmin);
  TestValidator.equals(
    "retrieved admin ID matches",
    retrievedAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches",
    retrievedAdmin.email,
    admin.email,
  );
  TestValidator.equals(
    "retrieved admin first name matches",
    retrievedAdmin.first_name,
    admin.first_name,
  );
  TestValidator.equals(
    "retrieved admin last name matches",
    retrievedAdmin.last_name,
    admin.last_name,
  );
  TestValidator.equals(
    "retrieved admin status matches",
    retrievedAdmin.status,
    admin.status,
  );
  TestValidator.equals(
    "retrieved admin role matches",
    retrievedAdmin.role,
    admin.role,
  );
}
