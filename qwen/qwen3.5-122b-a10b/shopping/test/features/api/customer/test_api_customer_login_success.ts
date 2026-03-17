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

/**
 * Test successful customer login with valid credentials.
 * 1. Register a new customer account
 * 2. Login with the registered credentials
 * 3. Validate the login response contains customer info and tokens
 * 4. Verify tokens are properly formatted and have expected properties
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate the login response
  TestValidator.equals("customer ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinEmail);
  TestValidator.predicate(
    "account status is active",
    loginResult.account_status === "active",
  );
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    loginResult.token.refreshable_until !== null,
  );
}
