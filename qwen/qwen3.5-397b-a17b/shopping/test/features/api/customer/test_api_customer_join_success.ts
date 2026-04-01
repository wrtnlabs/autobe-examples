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

/**
 * Test successful customer registration with valid email and password credentials.
 *
 * This test validates the complete customer join workflow:
 * 1. Creates a new customer account with unique email and password
 * 2. Verifies the system returns JWT authentication tokens (access and refresh)
 * 3. Validates customer profile information is included in response
 * 4. Confirms account timestamps are properly set
 * 5. Verifies the connection is automatically authenticated for subsequent calls
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Register new customer account using utility function
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Validate response structure with typia
  typia.assert(joinResult);
  // Verify customer ID exists and is valid UUID
  TestValidator.predicate("customer ID exists", joinResult.id !== null);
  TestValidator.predicate(
    "customer ID is valid format",
    joinResult.id.length > 0,
  );
  // Verify email matches the one used for registration
  TestValidator.equals("email matches input", joinResult.email, email);
  // Verify profile information exists
  TestValidator.predicate("profile exists", joinResult.profile !== null);
  TestValidator.predicate(
    "profile ID exists",
    joinResult.profile.id.length > 0,
  );
  TestValidator.predicate(
    "display name exists",
    joinResult.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "phone number exists",
    joinResult.profile.phone_number.length > 0,
  );
  // Verify profile customer relation exists
  TestValidator.predicate(
    "profile customer exists",
    joinResult.profile.customer !== null,
  );
  TestValidator.equals(
    "profile customer ID matches",
    joinResult.profile.customer.id,
    joinResult.id,
  );
  TestValidator.equals(
    "profile customer email matches",
    joinResult.profile.customer.email,
    email,
  );
  // Verify timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at exists",
    joinResult.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    joinResult.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null for new account",
    joinResult.deleted_at === null,
  );
  // Verify authorization token structure
  TestValidator.predicate(
    "access token exists",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "access token is JWT format",
    joinResult.token.access.includes("."),
  );
  TestValidator.predicate(
    "refresh token exists",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    joinResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    joinResult.token.refreshable_until.length > 0,
  );
  // Verify connection was updated with authorization token
  TestValidator.predicate(
    "connection has authorization header",
    customerConnection.headers !== undefined,
  );
  TestValidator.predicate(
    "connection has Authorization header",
    customerConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "Authorization header uses Bearer scheme",
    (customerConnection.headers?.Authorization as string).startsWith("Bearer "),
  );
}