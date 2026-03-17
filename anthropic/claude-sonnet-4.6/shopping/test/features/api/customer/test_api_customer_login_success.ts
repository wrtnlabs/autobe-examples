import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique credentials for this test run
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const nickname = RandomGenerator.name(1);
  // 2. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      nickname,
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 3. Login with the registered credentials (first session)
  const loginConnection1: api.IConnection = { host: connection.host };
  const loginResult1 = await authorize_customer_login(loginConnection1, {
    body: {
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult1);
  // 4. Validate business logic fields
  TestValidator.equals("email matches registration", loginResult1.email, email);
  TestValidator.equals(
    "nickname matches registration",
    loginResult1.nickname,
    nickname,
  );
  TestValidator.equals("account is not banned", loginResult1.isBanned, false);
  TestValidator.equals(
    "account is active (deletedAt is null)",
    loginResult1.deletedAt,
    null,
  );
  // 5. Validate nested customer object consistency
  TestValidator.equals(
    "customer.id matches top-level id",
    loginResult1.customer.id,
    loginResult1.id,
  );
  TestValidator.equals(
    "customer.email matches top-level email",
    loginResult1.customer.email,
    loginResult1.email,
  );
  TestValidator.equals(
    "customer.nickname matches top-level nickname",
    loginResult1.customer.nickname,
    loginResult1.nickname,
  );
  TestValidator.equals(
    "customer.isBanned matches top-level isBanned",
    loginResult1.customer.isBanned,
    loginResult1.isBanned,
  );
  TestValidator.equals(
    "customer.deletedAt matches top-level deletedAt",
    loginResult1.customer.deletedAt,
    loginResult1.deletedAt,
  );
  // 6. Validate token fields are non-empty
  TestValidator.predicate(
    "access token is non-empty",
    loginResult1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult1.token.refresh.length > 0,
  );
  // 7. Login again with the same credentials (second session) to test concurrent sessions
  const loginConnection2: api.IConnection = { host: connection.host };
  const loginResult2 = await authorize_customer_login(loginConnection2, {
    body: {
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult2);
  // 8. Verify that the two sessions produce distinct token pairs (session isolation)
  TestValidator.notEquals(
    "second login produces different access token",
    loginResult1.token.access,
    loginResult2.token.access,
  );
  TestValidator.notEquals(
    "second login produces different refresh token",
    loginResult1.token.refresh,
    loginResult2.token.refresh,
  );
  // 9. Verify same customer identity across both sessions
  TestValidator.equals(
    "same customer id across sessions",
    loginResult1.id,
    loginResult2.id,
  );
  TestValidator.equals(
    "same email across sessions",
    loginResult1.email,
    loginResult2.email,
  );
}
