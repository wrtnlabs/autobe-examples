import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that a platform admin role description can be added and later cleared
 * while timestamps and identity fields behave correctly.
 *
 * Business context: Platform admin roles in the shopping mall backend are
 * configured in the shopping_mall_admin_roles table. Operators may initially
 * create a role without any descriptive text, then later add a description for
 * clarity, and eventually clear it again when it becomes obsolete. The update
 * endpoint identified by the role's business code must correctly manage
 * nullable description_text while maintaining stable identifiers and proper
 * timestamp updates.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platform administrator account using POST
 *    /auth/platformAdmin/join so that subsequent admin role APIs can be called
 *    with proper authorization.
 * 2. Create a new admin role using POST /shoppingMall/platformAdmin/adminRoles
 *    with a unique code, a non-empty name, and description_text explicitly set
 *    to null. Confirm that the created role reflects description_text === null
 *    and that deleted_at is null.
 * 3. Call PUT /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} for the
 *    created role, using its code as the path parameter, and an
 *    IShoppingMallAdminRole.IUpdate body that sets description_text to a
 *    non-empty string while leaving name unchanged (omitted in the update
 *    payload). Verify that the response shows the new description_text, that id
 *    and code are unchanged, created_at is unchanged, updated_at has advanced,
 *    and deleted_at remains null.
 * 4. Call PUT again on the same {adminRoleCode}, this time passing an update body
 *    that sets description_text back to null and changes name to a new string.
 *    Verify that the final response has description_text === null, name equal
 *    to the new value, id and code still unchanged, created_at unchanged,
 *    updated_at advanced again beyond the previous value, and deleted_at still
 *    null.
 */
export async function test_api_admin_role_update_description_add_and_clear(
  connection: api.IConnection,
) {
  // 1. Join platform admin to obtain authorized session (token handled by SDK)
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Create an admin role with null description_text
  const roleCode = `ROLE_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const initialName = `Role ${RandomGenerator.name(1)}`;

  const createBody = {
    code: roleCode,
    name: initialName,
    description_text: null,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdRole);

  // Basic invariants on creation
  TestValidator.equals(
    "created role code matches request",
    createdRole.code,
    roleCode,
  );
  TestValidator.equals(
    "created role name matches request",
    createdRole.name,
    initialName,
  );
  TestValidator.equals(
    "created role description_text is null",
    createdRole.description_text ?? null,
    null,
  );
  TestValidator.equals(
    "created role deleted_at is null",
    createdRole.deleted_at ?? null,
    null,
  );

  const createdCreatedAt = createdRole.created_at;
  const createdUpdatedAt = createdRole.updated_at;

  // 3. Update role to add a non-empty description_text while leaving name unchanged
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });

  const firstUpdateBody = {
    description_text: newDescription,
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedOnce: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.update(
      connection,
      {
        adminRoleCode: roleCode,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedOnce);

  TestValidator.equals(
    "first update keeps same id",
    updatedOnce.id,
    createdRole.id,
  );
  TestValidator.equals(
    "first update keeps same code",
    updatedOnce.code,
    createdRole.code,
  );
  TestValidator.equals(
    "first update keeps created_at",
    updatedOnce.created_at,
    createdCreatedAt,
  );
  TestValidator.predicate(
    "first update updated_at is advanced",
    () => updatedOnce.updated_at > createdUpdatedAt,
  );
  TestValidator.equals(
    "first update description_text set to new value",
    updatedOnce.description_text ?? null,
    newDescription,
  );
  TestValidator.equals(
    "first update deleted_at still null",
    updatedOnce.deleted_at ?? null,
    null,
  );

  const updatedOnceUpdatedAt = updatedOnce.updated_at;

  // 4. Update again: clear description_text back to null and change name
  const secondName = `Role ${RandomGenerator.name(1)}`;

  const secondUpdateBody = {
    name: secondName,
    description_text: null,
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedTwice: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.update(
      connection,
      {
        adminRoleCode: roleCode,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedTwice);

  TestValidator.equals(
    "second update keeps same id",
    updatedTwice.id,
    createdRole.id,
  );
  TestValidator.equals(
    "second update keeps same code",
    updatedTwice.code,
    createdRole.code,
  );
  TestValidator.equals(
    "second update keeps created_at",
    updatedTwice.created_at,
    createdCreatedAt,
  );
  TestValidator.predicate(
    "second update updated_at is advanced again",
    () => updatedTwice.updated_at > updatedOnceUpdatedAt,
  );
  TestValidator.equals(
    "second update name changed to secondName",
    updatedTwice.name,
    secondName,
  );
  TestValidator.equals(
    "second update description_text cleared to null",
    updatedTwice.description_text ?? null,
    null,
  );
  TestValidator.equals(
    "second update deleted_at still null",
    updatedTwice.deleted_at ?? null,
    null,
  );
}
