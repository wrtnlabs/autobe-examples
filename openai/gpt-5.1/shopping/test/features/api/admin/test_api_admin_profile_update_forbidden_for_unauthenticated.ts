import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

export async function test_api_admin_profile_update_forbidden_for_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Create an admin via join to get a real adminId and authenticated context
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedAdmin);

  const adminId = joinedAdmin.id;

  // 2. Perform an initial authenticated profile update to establish baseline data
  const initialProfileUpdateBody = {
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const initialProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: initialProfileUpdateBody,
    });
  typia.assert(initialProfile);

  // 3. Prepare an unauthenticated connection by clearing headers without touching them afterward
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt unauthorized profile update with valid-looking body
  const unauthorizedUpdateBody = {
    full_name: RandomGenerator.name(3),
    phone_number: RandomGenerator.mobile("011"),
  } satisfies IShoppingMallAdminProfile.IUpdate;

  await TestValidator.error(
    "unauthenticated admin profile update should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.profile.update(
        unauthenticatedConnection,
        {
          adminId,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 5. Re-authenticate explicitly via login to ensure we still have a valid token
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // 6. Perform an authenticated profile update to confirm success when authorized
  const finalProfileUpdateBody = {
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile("010"),
  } satisfies IShoppingMallAdminProfile.IUpdate;

  const finalProfile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.update(connection, {
      adminId,
      body: finalProfileUpdateBody,
    });
  typia.assert(finalProfile);

  // 7. Ensure the final profile state reflects the authenticated update, not the unauthorized attempt
  TestValidator.equals(
    "final profile full_name should match authenticated update, not unauthorized attempt",
    finalProfile.full_name ?? null,
    finalProfileUpdateBody.full_name ?? null,
  );

  TestValidator.equals(
    "final profile phone_number should match authenticated update, not unauthorized attempt",
    finalProfile.phone_number ?? null,
    finalProfileUpdateBody.phone_number ?? null,
  );
}
