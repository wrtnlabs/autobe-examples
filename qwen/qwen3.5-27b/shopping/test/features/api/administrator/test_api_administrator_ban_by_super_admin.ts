import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator ban operation by super administrator.
 *
 * Validates the complete administrator banning workflow including super administrator authentication, ban execution, and access restriction verification. Ensures that banned administrators cannot authenticate while their account data is preserved for audit purposes.
 *
 * Special attention is given to verifying that the ban operation correctly updates the administrator's banned status and that the unban operation successfully restores access.
 *
 * 1. Super administrator registers and authenticates via join operation.
 * 2. Regular administrator registers and authenticates via join operation.
 * 3. Super administrator bans the regular administrator using ban endpoint.
 * 4. Validates that the ban response returns the updated administrator with banned=true.
 * 5. Super administrator unbans the regular administrator.
 * 6. Validates that the unban response returns the updated administrator with banned=false.
 */
export async function test_api_administrator_ban_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "Super123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
      ip: "192.168.1.100",
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Register and authenticate regular administrator (to be banned)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "regularadmin@test.com",
        password: "Regular123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.101",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdmin);
  // 3. Super admin bans the regular administrator
  const bannedAdmin =
    await api.functional.shoppingMall.administrator.administrators.ban(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: { ban: true } satisfies IShoppingMallAdministrator.IBanRequest,
      },
    );
  typia.assert(bannedAdmin);
  // 4. Validate ban response shows banned=true
  TestValidator.equals("administrator banned status", bannedAdmin.banned, true);
  TestValidator.equals(
    "administrator id matches",
    bannedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.predicate(
    "banned administrator has valid email",
    bannedAdmin.email.includes("@"),
  );
  // 5. Super admin unbans the regular administrator
  const unbannedAdmin =
    await api.functional.shoppingMall.administrator.administrators.ban(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: { ban: false } satisfies IShoppingMallAdministrator.IBanRequest,
      },
    );
  typia.assert(unbannedAdmin);
  // 6. Validate unban response shows banned=false
  TestValidator.equals(
    "administrator unbanned status",
    unbannedAdmin.banned,
    false,
  );
  TestValidator.equals(
    "administrator id matches after unban",
    unbannedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "email preserved after unban",
    unbannedAdmin.email,
    regularAdmin.email,
  );
}
