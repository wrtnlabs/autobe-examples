import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_retrieval_system_role(
  connection: api.IConnection,
) {
  /**
   * 1. Join as an admin to obtain authorized admin context.
   *
   *    - Use api.functional.auth.admin.join with IShoppingMallAdminJoin.ICreate
   *    - This call also sets Authorization header on the connection via SDK.
   */
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  /**
   * 2. Create a system-level admin role.
   *
   *    - Use api.functional.shoppingMall.admin.adminRoles.create
   *    - Is_system must be true to represent system-protected role
   *    - Code must be unique and stable for retrieval; embed random suffix.
   */
  const roleCodePrefix = "system_test_role";
  const roleCodeSuffix = RandomGenerator.alphaNumeric(8);
  const roleCode = `${roleCodePrefix}_${roleCodeSuffix}`;

  const createRoleBody = {
    code: roleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: true,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Basic field mirroring between request and created entity
  TestValidator.equals(
    "created role code mirrors input",
    createdRole.code,
    createRoleBody.code,
  );
  TestValidator.equals(
    "created role name mirrors input",
    createdRole.name,
    createRoleBody.name,
  );
  TestValidator.equals(
    "created role description mirrors input",
    createdRole.description ?? null,
    createRoleBody.description ?? null,
  );
  TestValidator.equals(
    "created role is_system must be true",
    createdRole.is_system,
    true,
  );

  /**
   * 3. Retrieve role details via GET
   *    /shoppingMall/admin/adminRoles/{adminRoleCode}.
   */
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert<IShoppingMallAdminRole>(fetchedRole);

  /** 4. Validate that fetched role reflects system role and mirrors created record. */
  TestValidator.equals(
    "fetched role code equals created role code",
    fetchedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "fetched role name equals created role name",
    fetchedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "fetched role description equals created role description",
    fetchedRole.description ?? null,
    createdRole.description ?? null,
  );
  TestValidator.equals(
    "fetched role is_system remains true",
    fetchedRole.is_system,
    createdRole.is_system,
  );

  /**
   * 5. Lifecycle field behavior: read should not change
   *    created_at/updated_at/deleted_at.
   *
   *    - Created_at and updated_at should remain stable between creation and fetch.
   *    - Deleted_at should remain null/undefined for active role.
   */
  TestValidator.equals(
    "created_at is stable between create and fetch",
    fetchedRole.created_at,
    createdRole.created_at,
  );
  TestValidator.equals(
    "updated_at is stable between create and fetch",
    fetchedRole.updated_at,
    createdRole.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null/undefined after fetch",
    fetchedRole.deleted_at ?? null,
    createdRole.deleted_at ?? null,
  );

  /** 6. Optional: perform a second fetch to confirm retrieval stability. */
  const refetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert<IShoppingMallAdminRole>(refetchedRole);

  TestValidator.equals(
    "second fetch returns same role code",
    refetchedRole.code,
    fetchedRole.code,
  );
  TestValidator.equals(
    "second fetch returns same name",
    refetchedRole.name,
    fetchedRole.name,
  );
  TestValidator.equals(
    "second fetch returns same description",
    refetchedRole.description ?? null,
    fetchedRole.description ?? null,
  );
  TestValidator.equals(
    "second fetch returns same is_system flag",
    refetchedRole.is_system,
    fetchedRole.is_system,
  );
  TestValidator.equals(
    "second fetch returns same created_at",
    refetchedRole.created_at,
    fetchedRole.created_at,
  );
  TestValidator.equals(
    "second fetch returns same updated_at",
    refetchedRole.updated_at,
    fetchedRole.updated_at,
  );
  TestValidator.equals(
    "second fetch returns same deleted_at",
    refetchedRole.deleted_at ?? null,
    fetchedRole.deleted_at ?? null,
  );
}
