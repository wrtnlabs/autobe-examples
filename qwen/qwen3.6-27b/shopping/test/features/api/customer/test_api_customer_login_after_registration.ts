import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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
 * Test the complete customer authentication lifecycle from registration to login.
 *
 * Validates the end-to-end workflow where a new customer registers an account and immediately logs in with those credentials. The test ensures that registration successfully creates the customer account and initial session, and that subsequent login authenticates the user and returns valid JWT tokens. Special attention is given to verifying that the login response contains properly structured authorization tokens with access and refresh tokens along with their expiration metadata, and that a fresh session is established.
 *
 * 1. Generate random customer credentials including email, password, href, and referrer.
 * 2. Register the new customer using the join endpoint and validate the response.
 * 3. Capture the registration credentials to reuse for login.
 * 4. Log in with the same credentials using the login endpoint.
 * 5. Validate the login response and verify tokens differ from registration tokens.
 */
export async function test_api_customer_login_after_registration(
  connection: api.IConnection,
) {
  // 1. Generate random customer credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  // 2. Register customer via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const registered: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_join(joinConnection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip: undefined,
      } satisfies IEcommercePlatformCustomer.IJoin,
    });
  typia.assert(registered);
  // 3. Validate business logic: registered customer email matches input
  TestValidator.equals(
    "registered customer email matches input",
    registered.email,
    email,
  );
  // 4. Log in with same credentials via login endpoint
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
  } satisfies IEcommercePlatformCustomer.ILogin;
  const loggedIn: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_login(loginConnection, { body: loginBody });
  typia.assert(loggedIn);
  // 5. Validate business logic: logged in customer email matches input
  TestValidator.equals(
    "logged in customer email matches input",
    loggedIn.email,
    email,
  );
  // 6. Verify login tokens differ from registration tokens (fresh session created)
  TestValidator.notEquals(
    "login access tokens differ from registration tokens",
    loggedIn.token.access,
    registered.token.access,
  );
  TestValidator.notEquals(
    "login refresh tokens differ from registration tokens",
    loggedIn.token.refresh,
    registered.token.refresh,
  );
}
