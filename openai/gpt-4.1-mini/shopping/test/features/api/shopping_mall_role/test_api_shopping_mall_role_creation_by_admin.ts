import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

export async function test_api_shopping_mall_role_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Perform admin join authentication to create an admin account and obtain authorization token
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "Admin1234!",
        ip: null,
        href: "https://shop.example.com/admin/join",
        referrer: "https://shop.example.com/login",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new unique shopping mall role using the admin authorization
  const roleCreateBody = {
    name: `role_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRole.ICreate;

  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(createdRole);

  TestValidator.equals(
    "created role name should match request",
    createdRole.name,
    roleCreateBody.name,
  );
  TestValidator.equals(
    "created role label should match request",
    createdRole.label,
    roleCreateBody.label,
  );
  if (
    createdRole.description !== null &&
    createdRole.description !== undefined
  ) {
    TestValidator.equals(
      "created role description should match request",
      createdRole.description,
      roleCreateBody.description,
    );
  }

  // 3. Attempt to create a duplicate role name and expect a runtime error due to uniqueness violation
  await TestValidator.error("cannot create duplicate role name", async () => {
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: {
          name: roleCreateBody.name,
          label: RandomGenerator.name(2),
          description: null,
        } satisfies IShoppingMallRole.ICreate,
      },
    );
  });
}
