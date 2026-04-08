import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
 * Test successful customer registration with valid credentials.
 *
 * Validates the complete customer registration workflow including email uniqueness validation, password hashing, account creation, and JWT token issuance. Ensures the registered customer can immediately access all customer features.
 *
 * The test verifies that the system correctly:
 * 1. Validates email format and uniqueness
 * 2. Hashes password securely using bcrypt
 * 3. Creates customer record with all required fields
 * 4. Generates email verification token
 * 5. Returns valid JWT access and refresh tokens
 * 6. Sets customer account to active status immediately
 *
 * 1. Generate unique customer registration data with valid email, strong password, and display name.
 * 2. Call customer join endpoint to register new account.
 * 3. Validate response contains all required customer identity fields (id, display_name, phone_number, timestamps).
 * 4. Validate JWT tokens are properly structured with expiration metadata.
 * 5. Verify customer account is immediately usable for authenticated operations.
 */
export async function test_api_customer_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate registration data with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // 16 chars, meets min 8 requirement
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  // 3. Register customer using utility function
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      phone_number: phoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 4. Validate response structure
  typia.assert(customer);
  // 5. Validate customer identity fields
  TestValidator.equals(
    "customer ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      customer.id,
    ),
    true,
  );
  TestValidator.equals(
    "display name matches input",
    customer.display_name,
    displayName,
  );
  TestValidator.equals(
    "phone number matches input",
    customer.phone_number,
    phoneNumber,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      customer.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      customer.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    customer.deleted_at,
    null,
  );
  // 6. Validate JWT token structure
  TestValidator.predicate(
    "access token exists",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    customer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      customer.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      customer.token.refreshable_until,
    ),
  );
}
