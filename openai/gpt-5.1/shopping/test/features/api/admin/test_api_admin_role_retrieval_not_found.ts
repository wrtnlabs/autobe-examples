import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a real admin role with some random but valid code.
  const existingRoleCode: string = `test_role_${RandomGenerator.alphaNumeric(12)}`;

  const createRoleBody = {
    code: existingRoleCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert(createdRole);

  // 3. Prepare a definitely non-existent role code;
  // ensure it does not collide with the created one.
  const nonexistentRoleCode: string = `nonexistent_role_code_${RandomGenerator.alphaNumeric(16)}`;
  TestValidator.notEquals(
    "nonexistent role code must differ from created role code",
    nonexistentRoleCode,
    existingRoleCode,
  );

  // 4. Call GET /shoppingMall/admin/adminRoles/{adminRoleCode}
  //    with the non-existent code and expect an HttpError 404.
  await TestValidator.httpError(
    "fetching admin role with non-existent code should respond with 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.adminRoles.at(connection, {
        adminRoleCode: nonexistentRoleCode,
      });
    },
  );
}
