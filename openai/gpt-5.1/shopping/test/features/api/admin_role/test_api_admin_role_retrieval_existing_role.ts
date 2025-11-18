import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_retrieval_existing_role(
  connection: api.IConnection,
) {
  // 1. Create an authenticated admin via join so that admin-only endpoints work
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive it, but href/referrer must be valid URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new non-system admin role with a unique code
  const roleCode: string = `role_${RandomGenerator.alphaNumeric(12)}`;
  const roleName: string = RandomGenerator.paragraph({ sentences: 2 });
  const roleDescription: string = RandomGenerator.paragraph({ sentences: 4 });

  const createRoleBody = {
    code: roleCode,
    name: roleName,
    description: roleDescription,
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert(createdRole);

  // Basic equality validations between input and created entity
  TestValidator.equals(
    "created role code matches request",
    createdRole.code,
    roleCode,
  );
  TestValidator.equals(
    "created role name matches request",
    createdRole.name,
    roleName,
  );
  TestValidator.equals(
    "created role description matches request",
    createdRole.description ?? null,
    roleDescription,
  );
  TestValidator.equals(
    "created role is_system flag matches request",
    createdRole.is_system,
    false,
  );

  // 3. Retrieve the role by its business code via detail endpoint
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert(fetchedRole);

  // 4. Validate all fields map correctly
  TestValidator.equals(
    "fetched role id should equal created role id",
    fetchedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "fetched role code matches created",
    fetchedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "fetched role name matches created",
    fetchedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "fetched role description matches created",
    fetchedRole.description ?? null,
    createdRole.description ?? null,
  );
  TestValidator.equals(
    "fetched role is_system matches created",
    fetchedRole.is_system,
    createdRole.is_system,
  );

  // created_at and updated_at should be preserved and valid date-time strings
  TestValidator.equals(
    "fetched role created_at matches created",
    fetchedRole.created_at,
    createdRole.created_at,
  );
  TestValidator.equals(
    "fetched role updated_at matches created",
    fetchedRole.updated_at,
    createdRole.updated_at,
  );

  // 5. deleted_at should be null or undefined for a freshly created active role
  TestValidator.equals(
    "created role deleted_at should be null or undefined",
    createdRole.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "fetched role deleted_at should be null or undefined",
    fetchedRole.deleted_at ?? null,
    null,
  );

  // 6. Ensure API did not accidentally return an array or other structure
  TestValidator.predicate(
    "fetched role is a single object, not an array",
    !Array.isArray(fetchedRole),
  );
}
