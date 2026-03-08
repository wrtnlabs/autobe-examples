import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test that attempting to promote a non-existent administrator returns 404 Not Found error.
  //
  // **Test Flow:**
  // 1. Create a super administrator account (requester)
  // 2. Super administrator attempts to promote using a non-existent administrator UUID
  // 3. Verify the system returns 404 Not Found error
  // 1. Create a super administrator account (requester)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(superAdminConnection, {});
  // 2. Generate a non-existent administrator UUID
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to promote the non-existent administrator
  // Expecting 404 Not Found error since the target administrator does not exist
  await TestValidator.httpError(
    "promotion of non-existent administrator should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.administrators.promote(
        superAdminConnection,
        {
          administratorId: nonExistentUuid,
          body: {
            confirmation: true,
          } satisfies IShoppingMallAdministrator.IPromote,
        },
      );
    },
  );
}
