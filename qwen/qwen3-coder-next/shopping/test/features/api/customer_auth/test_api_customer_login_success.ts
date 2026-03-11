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

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account for testing
  const customerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Test successful login with valid credentials
  const loginInput = {
    email: authorized.customer.email,
    password: joinInput.password!,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.ILogin;
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // Verify authenticated session
  TestValidator.equals(
    "customer ID matches after login",
    loginResult.customer.id,
    authorized.customer.id,
  );
  TestValidator.equals(
    "customer email matches after login",
    loginResult.customer.email,
    authorized.customer.email,
  );
  TestValidator.predicate(
    "session has valid expiration",
    loginResult.expired_at !== undefined,
  );
}