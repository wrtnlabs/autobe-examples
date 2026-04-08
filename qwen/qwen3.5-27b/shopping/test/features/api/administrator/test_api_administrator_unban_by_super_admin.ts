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
 * Test unbanning a previously banned administrator account by a super administrator.
 *
 * Validates the complete administrator ban/unban workflow including super administrator authentication, regular administrator registration, ban operation, and unban operation. Ensures that the banned status is correctly toggled and that the administrator account is properly restored.
 *
 * Special attention is given to verifying that the ban status transitions correctly from false to true and back to false, and that the unban response contains the correct updated administrator data.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Regular administrator registers to get their account ID.
 * 3. Super administrator bans the regular administrator (banned=true).
 * 4. Validates ban response shows banned=true.
 * 5. Super administrator unbans the regular administrator (banned=false).
 * 6. Validates unban response shows banned=false and correct administrator data.
 */
export async function test_api_administrator_unban_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "SuperAdmin123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.100",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Regular administrator setup
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "regularadmin@test.com",
        password: "RegularAdmin123",
        href: "https://test.com/admin/join",
        referrer: "https://test.com/admin",
        ip: "192.168.1.101",
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(regularAdminAuth);
  const regularAdminId: string = regularAdminAuth.id;
  // 3. Super admin bans the regular administrator
  const banResponse =
    await api.functional.shoppingMall.administrator.administrators.ban(
      superAdminConnection,
      {
        administratorId: regularAdminId,
        body: { ban: true } satisfies IShoppingMallAdministrator.IBanRequest,
      },
    );
  typia.assert(banResponse);
  // Verify ban was successful
  TestValidator.equals("admin banned", banResponse.banned, true);
  TestValidator.equals(
    "banned admin ID matches",
    banResponse.id,
    regularAdminId,
  );
  // 4. Super admin unbans the regular administrator
  const unbanResponse =
    await api.functional.shoppingMall.administrator.administrators.ban(
      superAdminConnection,
      {
        administratorId: regularAdminId,
        body: { ban: false } satisfies IShoppingMallAdministrator.IBanRequest,
      },
    );
  typia.assert(unbanResponse);
  // 5. Validate unban response shows banned=false
  TestValidator.equals("admin unbanned", unbanResponse.banned, false);
  TestValidator.equals(
    "unbanned admin ID matches",
    unbanResponse.id,
    regularAdminId,
  );
  TestValidator.equals(
    "email preserved",
    unbanResponse.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "grade preserved",
    unbanResponse.grade,
    regularAdminAuth.grade,
  );
  // 6. Verify updated_at timestamp changed after unban
  TestValidator.predicate(
    "updated_at changed after unban",
    new Date(unbanResponse.updated_at).getTime() >
      new Date(banResponse.updated_at).getTime(),
  );
}
