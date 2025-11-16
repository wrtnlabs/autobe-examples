import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that subsequent
  //    role-management APIs are authorized.
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create an initial, valid admin role. This establishes that the
  //    role-management feature is working and provides a real role to
  //    contrast against the later invalid delete attempt.
  const firstRoleCreate = typia.random<IShoppingMallAdminRole.ICreate>();

  const firstRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: firstRoleCreate },
    );
  typia.assert<IShoppingMallAdminRole>(firstRole);

  // 3. Attempt to delete a non-existent adminRoleCode.
  //    Construct a code that is guaranteed not to match the created role
  //    by prefixing with a clearly invalid marker and random suffix.
  const nonExistingCodePrefix = "NON_EXISTING_ROLE_CODE_";
  const nonExistingCode =
    nonExistingCodePrefix + RandomGenerator.alphaNumeric(16);

  // Sanity check: ensure the invalid code is different from the real role
  // code so we are not accidentally targeting an existing role.
  TestValidator.notEquals(
    "invalid role code must differ from existing role code",
    nonExistingCode,
    firstRole.code,
  );

  // 4. While authenticated as the platform admin, invoke the delete
  //    operation with the non-existent code and assert that it fails.
  await TestValidator.error(
    "deleting non-existing admin role should result in an error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.erase(
        connection,
        { adminRoleCode: nonExistingCode },
      );
    },
  );

  // 5. Create another valid role after the failed delete to confirm that
  //    role management remains fully functional and that the failed
  //    deletion did not corrupt role state or block subsequent creations.
  const secondRoleCreate = typia.random<IShoppingMallAdminRole.ICreate>();

  const secondRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: secondRoleCreate },
    );
  typia.assert<IShoppingMallAdminRole>(secondRole);

  // 6. Basic integrity check: the two created roles must be distinct.
  //    This is a weak but useful confirmation that we are dealing with
  //    independent role definitions before and after the failed delete.
  TestValidator.notEquals(
    "created roles before and after failed delete must be distinct",
    firstRole.code,
    secondRole.code,
  );
}
