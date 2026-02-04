import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_downgrade_conflict_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin connection and join to establish initial super admin account
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(firstSuperAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(firstSuperAdmin);
  // Step 2: Create a second super admin account to target for downgrade
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(secondSuperAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(secondSuperAdmin);
  // Step 3: Attempt to downgrade the second super admin account using the first super admin's connection
  await TestValidator.error(
    "downgrade conflict: super admin cannot downgrade another super admin",
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.downgrade(
        firstSuperAdminConnection,
        {
          adminId: secondSuperAdmin.id,
        },
      );
    },
  );
}
