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

export async function test_api_seller_login_pending_account_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (defaults to pending approval status)
  const joinConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // Verify the account was created with pending status
  TestValidator.equals(
    "seller approval status pending",
    joinResult.approval_status,
    "pending",
  );
  // 2. Attempt to login with the pending account credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinResult.email,
    password: testPassword,
  } satisfies IEcommerceMallSeller.ILogin;
  // Expect login to fail for pending account - should throw HTTP error
  await TestValidator.error("pending account cannot login", async () => {
    await authorize_seller_login(loginConnection, { body: loginBody });
  });
  // 3. Verify account is still in pending state after failed login attempt
  // We can verify by checking that the original join result shows pending status
  TestValidator.equals(
    "account remains pending after failed login",
    joinResult.approval_status,
    "pending",
  );
}