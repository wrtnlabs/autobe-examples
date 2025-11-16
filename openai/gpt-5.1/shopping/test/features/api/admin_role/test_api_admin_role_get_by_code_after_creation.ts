import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that a platform administrator can retrieve an admin role by its unique
 * code immediately after creating it.
 *
 * Business workflow:
 *
 * 1. Join as a new platform admin using POST /auth/platformAdmin/join to establish
 *    an authenticated session (IAuthorized) and automatically populate the
 *    connection's Authorization header.
 * 2. Create a new admin role via POST /shoppingMall/platformAdmin/adminRoles using
 *    IShoppingMallAdminRole.ICreate with a deterministic role code, name, and
 *    non-null description_text.
 * 3. Fetch that role by its code using GET
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}.
 * 4. Validate that the fetched role fully matches expectations:
 *
 *    - Typia.assert passes for IShoppingMallAdminRole
 *    - Code, name, and description_text are equal to the values sent on creation
 *    - Id is a UUID; created_at and updated_at are valid date-time strings
 *    - Deleted_at is null or undefined for a freshly-created role
 * 5. Perform a lightweight sanity check that another random code does not
 *    accidentally refer to the same role, by ensuring inequality of the
 *    adminRoleCode value (without asserting any HTTP error semantics).
 */
export async function test_api_admin_role_get_by_code_after_creation(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new admin role with deterministic but unique code
  const roleCodePrefix = "TEST_ROLE_" as const;
  const roleRandomSuffix = RandomGenerator.alphaNumeric(8).toUpperCase();
  const roleCode = `${roleCodePrefix}${roleRandomSuffix}`;

  const createRoleBody = {
    code: roleCode,
    name: `Test Role ${roleRandomSuffix}`,
    description_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: createRoleBody },
    );
  typia.assert(createdRole);

  // Basic consistency between create payload and created entity
  TestValidator.equals(
    "created role code should match request payload",
    createdRole.code,
    createRoleBody.code,
  );
  TestValidator.equals(
    "created role name should match request payload",
    createdRole.name,
    createRoleBody.name,
  );
  TestValidator.equals(
    "created role description_text should match request payload",
    createdRole.description_text,
    createRoleBody.description_text,
  );

  // 3. Retrieve the role by its code via GET /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.at(connection, {
      adminRoleCode: createdRole.code,
    });
  typia.assert(fetchedRole);

  // 4. Validate field-level consistency between created and fetched role
  TestValidator.equals(
    "fetched role id should equal created role id",
    fetchedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "fetched role code should equal created role code",
    fetchedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "fetched role name should equal created role name",
    fetchedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "fetched role description_text should equal created role description_text",
    fetchedRole.description_text,
    createdRole.description_text,
  );

  // created_at and updated_at must be valid date-time strings (already enforced by typia)
  // additionally assert they are equal or updated_at is after created_at
  TestValidator.predicate(
    "fetched role updated_at should be greater than or equal to created_at",
    new Date(fetchedRole.updated_at).getTime() >=
      new Date(fetchedRole.created_at).getTime(),
  );

  // deleted_at should be null or undefined for a freshly created role
  TestValidator.predicate(
    "fetched role deleted_at should be null or undefined right after creation",
    fetchedRole.deleted_at === null || fetchedRole.deleted_at === undefined,
  );

  // 5. Sanity check with another random code: ensure it is different from the created one
  const otherCode = `OTHER_${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  TestValidator.notEquals(
    "random other code should not equal created role code",
    otherCode,
    createdRole.code,
  );
}
