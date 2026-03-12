import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that newly registered customers can immediately access protected resources.
 *
 * This test verifies the customer registration flow and immediate authentication:
 * 1. Register a new customer account with valid credentials
 * 2. Verify registration returns authorization tokens
 * 3. Confirm customer identity is correctly resolved
 * 4. Validate account status is 'active' for immediate access
 * 5. Ensure connection headers are updated with access token
 */
export async function test_api_customer_join_immediate_access(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate registration input data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();
  const phone_number = RandomGenerator.mobile();
  // Register new customer using utility function
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      display_name,
      phone_number,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Validate registration response
  typia.assert(customer);
  // Verify customer identity matches input
  TestValidator.equals("email matches input", customer.email, email);
  TestValidator.equals(
    "display_name matches input",
    customer.display_name,
    display_name,
  );
  TestValidator.equals(
    "phone_number matches input",
    customer.phone_number,
    phone_number,
  );
  // Verify account status is active for immediate access
  TestValidator.equals("status is active", customer.status, "active");
  // Verify customer has valid UUID
  TestValidator.predicate("has valid customer id", customer.id.length > 0);
  // Verify timestamps are present
  TestValidator.predicate(
    "created_at is present",
    customer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    customer.updated_at.length > 0,
  );
  // Verify deleted_at is null for active account
  TestValidator.equals("deleted_at is null", customer.deleted_at, null);
  // Verify token structure
  typia.assert(customer.token);
  TestValidator.predicate("has access token", customer.token.access.length > 0);
  TestValidator.predicate(
    "has refresh token",
    customer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    customer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until",
    customer.token.refreshable_until.length > 0,
  );
  // Verify connection headers are updated with authorization token
  TestValidator.predicate(
    "connection has Authorization header",
    customerConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    customerConnection.headers?.Authorization,
    customer.token.access,
  );
}
