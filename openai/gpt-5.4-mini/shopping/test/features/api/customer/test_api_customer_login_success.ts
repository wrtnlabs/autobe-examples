import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
  const signupConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_customer_join(signupConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "customer id should match after login",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should match after login",
    loggedIn.email,
    email,
  );
  TestValidator.predicate(
    "access token should not be empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry should be present",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiry should be present",
    loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "account should be active",
    loggedIn.accountStatus.length > 0,
  );
  if (loggedIn.profile !== null) {
    TestValidator.equals(
      "profile customer id should match",
      loggedIn.profile.customer.id,
      loggedIn.id,
    );
    TestValidator.equals(
      "profile customer email should match",
      loggedIn.profile.customer.email,
      email,
    );
  }
  const reloginConnection: api.IConnection = { host: connection.host };
  const reloggedIn = await authorize_customer_login(reloginConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(reloggedIn);
  TestValidator.equals(
    "re-login should return same customer id",
    reloggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "re-login should return same customer email",
    reloggedIn.email,
    email,
  );
  TestValidator.equals(
    "re-login should remain authorized",
    reloggedIn.accountStatus,
    loggedIn.accountStatus,
  );
}
