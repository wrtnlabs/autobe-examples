import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid seller account for comparison testing
  const sellerConnection: api.IConnection = { host: connection.host };
  const validSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(validSeller);
  // Step 2: Attempt login with non-existent email address
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with non-existent email returns 401",
    401,
    async () => {
      await authorize_seller_login(nonExistentConnection, {
        body: {
          email: nonExistentEmail,
          password: "ValidPassword123!",
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
  // Step 3: Attempt login with valid email but wrong password
  // This should return identical 401 to prevent email enumeration attacks
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password returns 401 (identical to non-existent account)",
    401,
    async () => {
      await authorize_seller_login(wrongPasswordConnection, {
        body: {
          email: validSeller.email,
          password: "WrongPassword123!",
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
  // Both login attempts returned 401 without leaking account existence
  // confirming anti-enumeration protection through identical error responses
}
