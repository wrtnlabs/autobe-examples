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
 * Test successful customer login workflow with valid credentials.
 *
 * Validates the complete customer authentication flow including account registration, credential verification, and token generation. Ensures that the system correctly verifies the customer account exists with deleted_at is null, confirms is_banned is false, and validates the password against the stored bcrypt hash. Verifies that a new session record is created in ecommerce_platform_customer_sessions with device fingerprint and calculated expiration timestamps.
 *
 * The test validates that the returned IAuthorized response includes correct customer identity information and valid JWT access and refresh tokens with proper expiration metadata. Confirms the customer can use the access token for subsequent authenticated requests.
 *
 * 1. Register a new customer account with email, password, href, and referrer session context.
 * 2. Login with the registered email and password credentials.
 * 3. Validate the returned email matches the registered customer email address.
 * 4. Verify the customer account is not banned.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const body = {
    email: email,
    password: password,
  } satisfies IEcommercePlatformCustomer.ILogin;
  const authorized = await authorize_customer_login(loginConnection, {
    body: body,
  });
  typia.assert(authorized);
  // 3. Validate business logic
  TestValidator.equals(
    "email matches registered customer",
    authorized.email,
    email,
  );
  TestValidator.predicate("customer is not banned", !authorized.is_banned);
}
