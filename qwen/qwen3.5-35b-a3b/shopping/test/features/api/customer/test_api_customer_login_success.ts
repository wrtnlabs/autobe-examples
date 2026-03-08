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
  // Step 1: Register a new customer with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const registeredCustomer = await authorize_customer_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(registeredCustomer);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IEcommerceMallCustomer.ILogin;
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResponse);
  // Step 3: Verify JWT tokens and expiration
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expired_at is valid",
    loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    loginResponse.token.refreshable_until !== undefined,
  );
  // Step 4: Verify customer_id matches registered customer
  TestValidator.equals(
    "customer ID matches registration",
    registeredCustomer.id,
    loginResponse.id,
  );
  // Step 5: Verify concurrent sessions are allowed by logging in again
  const loginConnection2: api.IConnection = { host: connection.host };
  const loginResponse2 = await authorize_customer_login(loginConnection2, {
    body: loginInput,
  });
  typia.assert(loginResponse2);
  // Verify second login succeeded with same customer ID
  TestValidator.equals(
    "second login customer ID matches",
    registeredCustomer.id,
    loginResponse2.id,
  );
  TestValidator.notEquals(
    "second login token differs from first",
    loginResponse.token.access,
    loginResponse2.token.access,
  );
}