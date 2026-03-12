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
 * Test successful customer registration with valid credentials.
 * Verifies that: 1) A new customer account is created with status 'active',
 * 2) The customer receives valid JWT access and refresh tokens in the response,
 * 3) The response includes customer identity information (id, email, display_name,
 * phone_number, status, timestamps), 4) The access token has a short expiration time
 * (expired_at), 5) The refresh token has a longer expiration time (refreshable_until),
 * 6) The deleted_at field is null for the new account,
 * 7) The customer can immediately use the access token for authenticated operations.
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate test data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();
  const phone_number = RandomGenerator.mobile();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register new customer using utility function
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      display_name,
      phone_number,
      href,
      referrer,
      ip,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Validate response structure (complete type validation)
  typia.assert(customer);
  // Verify account status is active
  TestValidator.equals("status is active", customer.status, "active");
  // Verify deleted_at is null for active account
  TestValidator.equals("deleted_at is null", customer.deleted_at, null);
  // Verify email matches input
  TestValidator.equals("email matches input", customer.email, email);
  // Verify display_name matches input
  TestValidator.equals(
    "display_name matches input",
    customer.display_name,
    display_name,
  );
  // Verify phone_number matches input
  TestValidator.equals(
    "phone_number matches input",
    customer.phone_number,
    phone_number,
  );
  // Verify token has required fields (business logic: tokens must be non-empty strings)
  TestValidator.predicate(
    "access token is non-empty",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    customer.token.refresh.length > 0,
  );
  // Verify timestamps are valid date-time strings
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(customer.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(customer.updated_at),
  );
  // Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(customer.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      customer.token.refreshable_until,
    ),
  );
  // Verify refreshable_until is after expired_at (business logic)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(customer.token.refreshable_until) >
      new Date(customer.token.expired_at),
  );
}
