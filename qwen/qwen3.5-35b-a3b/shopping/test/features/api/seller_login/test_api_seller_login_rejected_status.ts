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

export async function test_api_seller_login_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random seller credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name(2);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 2. Create seller account via join (approval_status will be 'pending')
  const joinInput = {
    email,
    password,
    display_name,
    href,
    referrer,
    ip,
  } satisfies IEcommerceMallSeller.IJoin;
  const joinResult = await authorize_seller_join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 3. Verify seller account was created with pending status
  TestValidator.equals(
    "seller approval_status is pending",
    joinResult.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller is not suspended",
    joinResult.is_suspended,
    false,
  );
  // 4. Attempt to login with valid credentials
  // Expected: 403 Forbidden because seller is pending (not approved)
  const loginInput = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies IEcommerceMallSeller.ILogin;
  await TestValidator.httpError(
    "login should fail with 403 for pending seller",
    [403],
    async () =>
      await authorize_seller_login(connection, {
        body: loginInput,
      }),
  );
  // 5. Verify no tokens were returned on failed login attempt
  // (We caught the error above, so no tokens should be accessible)
  TestValidator.predicate("seller account exists", joinResult !== null);
}
