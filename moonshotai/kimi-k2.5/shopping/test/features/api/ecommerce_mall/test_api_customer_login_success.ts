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
 * Test successful customer login with valid email and password credentials.
 * The customer should be able to authenticate and receive JWT access and refresh tokens
 * along with their profile information.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a customer account first to have valid credentials
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    },
  });
  typia.assert(registeredCustomer);
  // Step 2: Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: {
      email: registeredCustomer.email,
      password: "Password123!",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Verify response email matches the login credential
  TestValidator.equals(
    "email matches login credential",
    loginResponse.email,
    registeredCustomer.email,
  );
  // Step 4: Verify token expiration timestamps are in the future (business logic)
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expires in the future",
    loginResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refresh token expires in the future",
    loginResponse.token.refreshable_until > now,
  );
  // Step 5: Verify tokens are non-empty strings (business logic check, not type validation)
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
}
