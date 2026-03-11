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

export async function test_api_administrator_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator with known credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Create a new connection for registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Register administrator using utility function
  const administrator = await authorize_administrator_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(administrator);
  // Step 2: Prepare wrong password (different from the registered one)
  const wrongPassword = password + "_wrong_suffix";
  // Step 3: Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  // Validate that login fails with wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.shoppingMall.auth.administrator.login(
        loginConnection,
        {
          body: {
            email,
            password: wrongPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallAdministrator.ILogin,
        },
      );
    },
  );
}
