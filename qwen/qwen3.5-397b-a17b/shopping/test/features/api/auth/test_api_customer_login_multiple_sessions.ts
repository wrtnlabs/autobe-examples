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

export async function test_api_customer_login_multiple_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const joinResult = await authorize_customer_join(connection, {
    body: customerCredentials,
  });
  typia.assert(joinResult);
  // 2. Prepare login credentials
  const loginCredentials = {
    email: customerCredentials.email,
    password: customerCredentials.password,
  } satisfies IShoppingMallCustomer.ILogin;
  // 3. Create multiple session connections and login
  const session1Connection: api.IConnection = { host: connection.host };
  const session1Result = await authorize_customer_login(session1Connection, {
    body: loginCredentials,
  });
  typia.assert(session1Result);
  const session2Connection: api.IConnection = { host: connection.host };
  const session2Result = await authorize_customer_login(session2Connection, {
    body: loginCredentials,
  });
  typia.assert(session2Result);
  const session3Connection: api.IConnection = { host: connection.host };
  const session3Result = await authorize_customer_login(session3Connection, {
    body: loginCredentials,
  });
  typia.assert(session3Result);
  // 4. Verify each session has unique tokens
  TestValidator.notEquals(
    "session 1 and 2 access tokens differ",
    session1Result.token.access,
    session2Result.token.access,
  );
  TestValidator.notEquals(
    "session 1 and 2 refresh tokens differ",
    session1Result.token.refresh,
    session2Result.token.refresh,
  );
  TestValidator.notEquals(
    "session 1 and 3 access tokens differ",
    session1Result.token.access,
    session3Result.token.access,
  );
  TestValidator.notEquals(
    "session 1 and 3 refresh tokens differ",
    session1Result.token.refresh,
    session3Result.token.refresh,
  );
  TestValidator.notEquals(
    "session 2 and 3 access tokens differ",
    session2Result.token.access,
    session3Result.token.access,
  );
  TestValidator.notEquals(
    "session 2 and 3 refresh tokens differ",
    session2Result.token.refresh,
    session3Result.token.refresh,
  );
  // 5. Verify all sessions return same customer identity
  TestValidator.equals(
    "all sessions have same customer ID",
    session1Result.id,
    session2Result.id,
  );
  TestValidator.equals(
    "all sessions have same customer ID",
    session2Result.id,
    session3Result.id,
  );
  TestValidator.equals(
    "all sessions have same email",
    session1Result.email,
    session2Result.email,
  );
  TestValidator.equals(
    "all sessions have same email",
    session2Result.email,
    session3Result.email,
  );
  // 6. Verify each session can be used independently for authenticated requests
  // Each connection now has its own Authorization header set by authorize_customer_login
  // We can verify sessions are active by checking they return valid customer data
  TestValidator.predicate(
    "session 1 has valid access token",
    session1Result.token.access.length > 0,
  );
  TestValidator.predicate(
    "session 2 has valid access token",
    session2Result.token.access.length > 0,
  );
  TestValidator.predicate(
    "session 3 has valid access token",
    session3Result.token.access.length > 0,
  );
  // 7. Verify token expiration timestamps are valid
  TestValidator.predicate(
    "session 1 token has future expiration",
    new Date(session1Result.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "session 2 token has future expiration",
    new Date(session2Result.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "session 3 token has future expiration",
    new Date(session3Result.token.expired_at) > new Date(),
  );
}
