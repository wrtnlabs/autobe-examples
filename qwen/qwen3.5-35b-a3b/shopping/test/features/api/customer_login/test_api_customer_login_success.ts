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
 * Test customer login workflow with valid credentials.
 * 1. Create customer account via join
 * 2. Login with same credentials
 * 3. Validate response structure and tokens
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.Format<"email"> &
    tags.MinLength<1> &
    tags.MaxLength<255>;
  const joinPassword = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.MinLength<8> &
    tags.Format<"password">;
  const joinOutput = await authorize_customer_join(customerConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Login: Authenticate with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_customer_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: "https://example.com/login" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginOutput);
  // 3. Validation: Check response structure
  TestValidator.equals(
    "customer email matches",
    loginOutput.email,
    joinOutput.email,
  );
  TestValidator.predicate("customer id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginOutput.id,
    ),
  );
  TestValidator.equals("customer is not banned", loginOutput.is_banned, false);
  TestValidator.predicate(
    "account creation timestamp is valid",
    () => !isNaN(Date.parse(loginOutput.created_at)),
  );
  TestValidator.predicate(
    "account update timestamp is valid",
    () => !isNaN(Date.parse(loginOutput.updated_at)),
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "access token exists",
    () => loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginOutput.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is valid date-time",
    () => !isNaN(Date.parse(loginOutput.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable until is valid date-time",
    () => !isNaN(Date.parse(loginOutput.token.refreshable_until)),
  );
  TestValidator.predicate(
    "access token expiration is before refreshable until",
    () =>
      new Date(loginOutput.token.expired_at).getTime() <=
      new Date(loginOutput.token.refreshable_until).getTime(),
  );
}
