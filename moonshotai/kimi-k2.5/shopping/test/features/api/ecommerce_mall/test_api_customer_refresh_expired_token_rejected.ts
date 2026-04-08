import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_expired_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer to obtain tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Step 2: Attempt to refresh with an expired/invalid refresh token
  // Using a random UUID that is not a valid refresh token (simulating expired/invalid token)
  const expiredRefreshToken = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify the system rejects the refresh attempt
  await TestValidator.httpError(
    "expired refresh token should be rejected",
    401,
    async () => {
      await authorize_customer_refresh(customerConnection, {
        body: {
          refresh: expiredRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
}
