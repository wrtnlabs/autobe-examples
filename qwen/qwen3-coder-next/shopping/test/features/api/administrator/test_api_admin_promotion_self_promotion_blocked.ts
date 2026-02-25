import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_promotion_self_promotion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login super administrator
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphabets(12);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Get super admin ID from profile
  const superAdminProfile: IShoppingMallAdmin.IAuthorized = superAdminConnection
    .headers?.["x-autobe-profile"]
    ? JSON.parse(
        atob(
          (superAdminConnection.headers["x-autobe-profile"] as string).split(
            ".",
          )[1],
        ),
      )
    : typia.random<IShoppingMallAdmin.IAuthorized>();
  // 2. Attempt self-promotion (should fail)
  const promoteConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(promoteConnection, {
    body: {
      email: typia.assert<string & tags.MaxLength<255> & tags.Format<"email">>(
        superAdminEmail,
      ),
      password: superAdminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  await TestValidator.error(
    "super administrator cannot promote themselves",
    async () => {
      await api.functional.shoppingMall.admin.administrators.promote(
        promoteConnection,
        {
          adminId: superAdminProfile.id,
          body: {
            reason: "Testing self-promotion protection",
          } satisfies IShoppingMallAdmin.IPromote,
        },
      );
    },
  );
}