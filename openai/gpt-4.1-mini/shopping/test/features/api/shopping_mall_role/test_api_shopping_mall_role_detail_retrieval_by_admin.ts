import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

export async function test_api_shopping_mall_role_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123",
        ip: null,
        href: "https://localhost/admin/join",
        referrer: "https://localhost",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a shopping mall role that will be later retrieved
  const roleName = `role_${RandomGenerator.alphaNumeric(8)}`;
  const roleLabel = RandomGenerator.paragraph({ sentences: 3 });
  const roleDescription = RandomGenerator.content({ paragraphs: 1 });
  const createBody = {
    name: roleName,
    label: roleLabel,
    description: roleDescription,
  } satisfies IShoppingMallRole.ICreate;

  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRole);

  // 3. Retrieve the role details by name
  const retrievedRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.at(connection, {
      name: roleName,
    });
  typia.assert(retrievedRole);

  // 4. Verify that the retrieved role matches the created role
  TestValidator.equals("role id matches", retrievedRole.id, createdRole.id);
  TestValidator.equals("role name matches", retrievedRole.name, roleName);
  TestValidator.equals("role label matches", retrievedRole.label, roleLabel);
  TestValidator.equals(
    "role description matches",
    retrievedRole.description ?? null,
    roleDescription ?? null,
  );

  // 5. Verify that timestamps exist and are valid ISO 8601 strings by typia.assert
  typia.assert<string & tags.Format<"date-time">>(retrievedRole.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedRole.updated_at);
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      retrievedRole.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      retrievedRole.updated_at,
    ),
  );
}
