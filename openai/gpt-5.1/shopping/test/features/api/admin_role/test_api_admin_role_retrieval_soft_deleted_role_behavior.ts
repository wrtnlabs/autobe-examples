import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate retrieval behavior and lifecycle fields for admin roles, with a
 * focus on deleted_at semantics.
 *
 * Business context:
 *
 * - Admin roles live in shopping_mall_admin_roles and are managed by admin
 *   actors.
 * - Each role has a stable machine code, human name, optional description, flags,
 *   and lifecycle timestamps including deleted_at.
 * - Soft deletion is expressed via deleted_at being non-null, but this test
 *   environment does not expose an API to toggle that flag nor allow direct DB
 *   mutation.
 *
 * Therefore this test focuses on the observable, implementable contract:
 *
 * 1. An admin can be created and authenticated through POST /auth/admin/join.
 * 2. That admin can create a new role through POST /shoppingMall/admin/adminRoles.
 * 3. The role can be retrieved by its code through GET
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}.
 * 4. The retrieved role must:
 *
 *    - Match the created role’s id, code, and other primary business fields.
 *    - Expose valid created_at and updated_at timestamps.
 *    - Have deleted_at null (or undefined) for a freshly created, non-deleted role,
 *         implicitly validating lifecycle semantics.
 * 5. Repeated retrieval calls for the same code must be consistent.
 */
export async function test_api_admin_role_retrieval_soft_deleted_role_behavior(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure that the join call actually established an admin session
  TestValidator.predicate(
    "admin join should return a non-null token",
    adminAuthorized.token.access.length > 0,
  );

  // 2. Create a new admin role via POST /shoppingMall/admin/adminRoles
  const uniqueCodeBase = RandomGenerator.alphaNumeric(16);
  const roleCreateBody = {
    code: `role_${uniqueCodeBase}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert(createdRole);

  // Validate that the created role’s lifecycle fields are present and deleted_at is null/undefined
  TestValidator.equals(
    "created role code should equal requested code",
    createdRole.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "created role name should equal requested name",
    createdRole.name,
    roleCreateBody.name,
  );
  TestValidator.equals(
    "created role is_system flag should equal requested flag",
    createdRole.is_system,
    roleCreateBody.is_system,
  );

  TestValidator.predicate(
    "created_at should be a non-empty ISO date-time string",
    createdRole.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO date-time string",
    createdRole.updated_at.length > 0,
  );

  TestValidator.equals(
    "newly created role should not be soft-deleted (deleted_at null or undefined)",
    createdRole.deleted_at ?? null,
    null,
  );

  // 3. Retrieve the role by its code via GET /shoppingMall/admin/adminRoles/{adminRoleCode}
  const firstRead: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: createdRole.code,
    });
  typia.assert(firstRead);

  // 4. Validate that retrieved role matches created role and lifecycle semantics
  TestValidator.equals(
    "retrieved role id should equal created role id",
    firstRead.id,
    createdRole.id,
  );
  TestValidator.equals(
    "retrieved role code should equal created role code",
    firstRead.code,
    createdRole.code,
  );
  TestValidator.equals(
    "retrieved role name should equal created role name",
    firstRead.name,
    createdRole.name,
  );
  TestValidator.equals(
    "retrieved role is_system flag should equal created role is_system",
    firstRead.is_system,
    createdRole.is_system,
  );
  TestValidator.equals(
    "retrieved role description should equal created role description",
    firstRead.description ?? null,
    createdRole.description ?? null,
  );

  TestValidator.equals(
    "retrieved role deleted_at should still indicate not soft-deleted",
    firstRead.deleted_at ?? null,
    null,
  );

  // 5. Re-read the same role and assert consistency across calls
  const secondRead: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: createdRole.code,
    });
  typia.assert(secondRead);

  TestValidator.equals(
    "second retrieval id should match first retrieval id",
    secondRead.id,
    firstRead.id,
  );
  TestValidator.equals(
    "second retrieval code should match first retrieval code",
    secondRead.code,
    firstRead.code,
  );
  TestValidator.equals(
    "second retrieval name should match first retrieval name",
    secondRead.name,
    firstRead.name,
  );
  TestValidator.equals(
    "second retrieval description should match first retrieval description",
    secondRead.description ?? null,
    firstRead.description ?? null,
  );
  TestValidator.equals(
    "second retrieval is_system should match first retrieval is_system",
    secondRead.is_system,
    firstRead.is_system,
  );
  TestValidator.equals(
    "second retrieval deleted_at should match first retrieval deleted_at",
    secondRead.deleted_at ?? null,
    firstRead.deleted_at ?? null,
  );
}
