import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that fetching an admin role by code reflects updates performed
 * through the role update API while preserving stable identity and business
 * key.
 *
 * Business workflow:
 *
 * 1. Bootstrap a platform admin account via POST /auth/platformAdmin/join so that
 *    subsequent adminRole operations are authorized.
 * 2. Create an admin role via POST /shoppingMall/platformAdmin/adminRoles using
 *    IShoppingMallAdminRole.ICreate.
 * 3. Immediately fetch the role with GET
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} and ensure it
 *    matches the created representation.
 * 4. Update the role via PUT
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} using
 *    IShoppingMallAdminRole.IUpdate, changing name and description_text.
 * 5. Fetch the role again via GET and verify that the updated values are reflected
 *    and that updated_at has advanced while id, code, and created_at remain
 *    stable.
 * 6. Confirm deleted_at stays null, demonstrating that only a metadata update
 *    occurred and not a soft delete.
 */
export async function test_api_admin_role_get_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain credentials and authorization context.
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(platformAdmin);

  // 2. Create an admin role with an initial code, name, and description.
  const initialRoleCode: string = `ROLE_${RandomGenerator.alphabets(8).toUpperCase()}`;
  const initialCreateBody = {
    code: initialRoleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: initialCreateBody },
    );
  typia.assert(createdRole);

  // Basic invariants on the created role.
  TestValidator.equals(
    "created role code should match request code",
    createdRole.code,
    initialRoleCode,
  );
  TestValidator.predicate(
    "created role created_at and updated_at should be non-empty",
    createdRole.created_at.length > 0 && createdRole.updated_at.length > 0,
  );
  TestValidator.equals(
    "created role deleted_at should be null",
    createdRole.deleted_at ?? null,
    null,
  );

  // 3. Fetch the role via GET and ensure it matches the created representation.
  const fetchedInitial: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.at(connection, {
      adminRoleCode: createdRole.code,
    });
  typia.assert(fetchedInitial);

  TestValidator.equals(
    "fetched role after create should deeply equal created role",
    fetchedInitial,
    createdRole,
  );

  // 4. Update the role's name and description_text while keeping the same code.
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.update(
      connection,
      {
        adminRoleCode: createdRole.code,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);

  // 5. Validate identity stability and field changes on the updated role.
  TestValidator.equals(
    "updated role id should remain identical",
    updatedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "updated role code should remain identical",
    updatedRole.code,
    createdRole.code,
  );
  TestValidator.notEquals(
    "updated role name should differ from original",
    updatedRole.name,
    createdRole.name,
  );
  TestValidator.notEquals(
    "updated role description_text should differ from original",
    updatedRole.description_text ?? null,
    createdRole.description_text ?? null,
  );
  TestValidator.equals(
    "updated role created_at should remain unchanged",
    updatedRole.created_at,
    createdRole.created_at,
  );

  // Compare updated_at as ISO date-time strings to ensure it advanced.
  const createdUpdatedAtMs = Date.parse(createdRole.updated_at);
  const updatedUpdatedAtMs = Date.parse(updatedRole.updated_at);
  TestValidator.predicate(
    "updated_at should be strictly later after update",
    updatedUpdatedAtMs > createdUpdatedAtMs,
  );

  TestValidator.equals(
    "updated role deleted_at should still be null",
    updatedRole.deleted_at ?? null,
    null,
  );

  // 6. Fetch again via GET and confirm it reflects the updated state exactly.
  const fetchedAfterUpdate: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.at(connection, {
      adminRoleCode: createdRole.code,
    });
  typia.assert(fetchedAfterUpdate);

  TestValidator.equals(
    "GET after update should return the updated role representation",
    fetchedAfterUpdate,
    updatedRole,
  );

  // Business key stability: adminRoleCode is always the original role.code.
  TestValidator.equals(
    "business key (code) remains stable throughout scenario",
    fetchedAfterUpdate.code,
    initialRoleCode,
  );
}
