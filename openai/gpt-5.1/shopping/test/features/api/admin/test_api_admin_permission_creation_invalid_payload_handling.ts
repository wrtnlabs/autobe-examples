import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_creation_invalid_payload_handling(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Attempt to create a permission with a code that violates naming conventions
  const invalidCodeWithSpacesBody = {
    code: "orders manage ! bad code", // contains spaces and invalid special characters
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  await TestValidator.error(
    "permission creation fails for code with spaces and special characters",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        {
          body: invalidCodeWithSpacesBody,
        },
      );
    },
  );

  // 3. Attempt to create a permission with an excessively long code
  const longCodeSegment = "orders.manage";
  const extremelyLongCode = ArrayUtil.repeat(200, () => longCodeSegment).join(
    ".",
  );

  const invalidLongCodeBody = {
    code: extremelyLongCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  await TestValidator.error(
    "permission creation fails for excessively long code",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        {
          body: invalidLongCodeBody,
        },
      );
    },
  );

  // 4. Positive control: create a permission with a valid, well-formed code
  const validCodeBase = "orders.manage";
  const validCodeSuffix = RandomGenerator.alphaNumeric(8);
  const validPermissionBody = {
    code: `${validCodeBase}.${validCodeSuffix}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: validPermissionBody,
      },
    );
  typia.assert(createdPermission);

  // Basic business-level validations on successful creation
  TestValidator.equals(
    "created permission code should match input",
    createdPermission.code,
    validPermissionBody.code,
  );
  TestValidator.equals(
    "created permission name should match input",
    createdPermission.name,
    validPermissionBody.name,
  );
  TestValidator.equals(
    "created permission category should match input",
    createdPermission.category ?? null,
    validPermissionBody.category ?? null,
  );
}
