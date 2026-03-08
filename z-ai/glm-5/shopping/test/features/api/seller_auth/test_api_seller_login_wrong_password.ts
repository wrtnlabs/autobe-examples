import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that login fails with incorrect password for a valid seller account.
 *
 * This test verifies the security measure that prevents unauthorized access
 * when an incorrect password is provided, ensuring password verification
 * works correctly and generic error messages prevent account enumeration.
 */
export async function test_api_seller_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller account with a known password
  const correctPassword = "correctPassword123!";
  const seller = await authorize_seller_join(connection, {
    body: {
      password: correctPassword,
    },
  });
  typia.assert(seller);
  // Step 2: Create a new connection for login attempt (connection isolation)
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt login with wrong password - should fail with 401
  const wrongPassword = "wrongPassword456!";
  await TestValidator.httpError(
    "login should fail with wrong password",
    401,
    async () => {
      await api.functional.shoppingMall.auth.seller.login(loginConnection, {
        body: {
          email: seller.email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
}
