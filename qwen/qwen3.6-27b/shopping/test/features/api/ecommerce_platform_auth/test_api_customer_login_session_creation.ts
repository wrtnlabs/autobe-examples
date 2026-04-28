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
 * Test login authentication with session creation and token lifecycle management.
 *
 * Validates customer login authentication by registering a new customer account and logging in with valid credentials. The authentication system creates a session record with device fingerprint and refresh token lifecycle. JWT tokens in the response contain properly structured access and refresh tokens with expiration metadata including expired_at and refreshable_until timestamps in ISO 8601 format.
 *
 * 1. Register a new customer account with email and password.
 * 2. Authenticate using the same credentials to create a new session.
 * 3. Validate that the login response contains properly formatted authorization tokens with access and refresh token expiration times.
 */
export async function test_api_customer_login_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(registered);
  // 2. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_login(loginConnection, {
    body: {
      email: registered.email,
      password: testPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  typia.assert(authorized);
}
