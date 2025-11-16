import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_role_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new admin role using the authorized platform admin session
  const roleCode = `ROLE_${RandomGenerator.alphaNumeric(12)}`;
  const roleName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const roleDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const createBody = {
    code: roleCode,
    name: roleName,
    description_text: roleDescription,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRole);

  // 3. Business validations on created role
  TestValidator.predicate(
    "created role id must be non-empty string",
    createdRole.id.length > 0,
  );

  TestValidator.equals(
    "created role code must match requested code",
    createdRole.code,
    roleCode,
  );

  TestValidator.equals(
    "created role name must match requested name",
    createdRole.name,
    roleName,
  );

  TestValidator.equals(
    "created role description_text must match requested description",
    createdRole.description_text ?? null,
    roleDescription,
  );

  TestValidator.predicate(
    "created_at must be a non-empty string",
    createdRole.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty string",
    createdRole.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null or undefined for newly created role",
    createdRole.deleted_at === null || createdRole.deleted_at === undefined,
  );
}
