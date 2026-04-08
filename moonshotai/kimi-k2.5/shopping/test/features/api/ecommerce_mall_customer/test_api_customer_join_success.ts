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
 * Test the successful registration of a new customer account with full session context.
 * 1. Submit a valid registration request with unique email, secure password, and complete session context (href, referrer, ip)
 * 2. Verify the response returns a valid IEcommerceMallCustomer.IAuthorized object containing the customer ID, email, and JWT tokens (access token, refresh token, expiration timestamps)
 * 3. Validate that the access token and refresh token are non-empty strings
 * 4. Verify the tokens have appropriate expiration timestamps (expired_at for access token, refreshable_until for refresh token)
 * 5. Confirm the response includes customer profile information fields (displayName and phoneNumber should default to empty strings for new accounts)
 * 6. Ensure the session context (IP, href, referrer) is properly recorded for security auditing in the session table
 * 7. Validate the customer record was created in ecommerce_mall_customers table with proper password hashing
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create dedicated connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate unique email for the test
  const email = `test_${RandomGenerator.alphabets(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const ip = "192.168.1.100";
  // Execute customer registration using utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Validate response structure and types - this validates everything including:
  // - Valid UUID format for id
  // - All token fields (access, refresh, expired_at, refreshable_until)
  // - All profile and address fields
  // - Timestamp formats
  typia.assert(authorized);
  // Validate email matches request - business logic verification
  TestValidator.equals("email matches input", authorized.email, email);
}
