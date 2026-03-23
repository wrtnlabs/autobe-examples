import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_rejection_unapproved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Step 2: Verify seller account is created with pending status
  TestValidator.equals(
    "seller approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  // Step 3: Attempt login with valid credentials (should fail due to pending status)
  await TestValidator.error(
    "login should be rejected for unapproved seller",
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      await authorize_seller_login(loginConnection, {
        body: {
          email: registeredSeller.email,
          password: "Password123!",
        } satisfies IEcommerceMallSeller.ILogin,
      });
    },
  );
}
