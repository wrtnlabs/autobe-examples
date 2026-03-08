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
 * Test customer registration success.
 * Customer successfully registers a new account with valid email and password
 * that meets security requirements. The system creates a customer record with
 * active status and returns authentication tokens.
 */
export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data with password meeting security requirements
  // Password must have: minimum 8 chars, uppercase, lowercase, numbers, special characters
  const password = RandomGenerator.alphaNumeric(12) + "!@#123";
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    display_name: null,
    phone_number: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallCustomer.IJoin;
  // Register customer
  const output: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: joinInput,
    });
  // Validate response structure
  typia.assert(output);
  // Validate account status is active
  TestValidator.equals(
    "account status is active",
    output.account_status,
    "active",
  );
  // Validate customer ID is valid UUID
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Validate email matches input
  TestValidator.equals("email matches input", output.email, joinInput.email);
  // Validate display_name is null as provided
  TestValidator.equals("display_name is null", output.display_name, null);
  // Validate phone_number is null as provided
  TestValidator.equals("phone_number is null", output.phone_number, null);
  // Validate tokens are present
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.token.refreshable_until,
    ),
  );
  // Validate timestamps are valid
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.updated_at,
    ),
  );
  // Validate deleted_at is null for new account
  TestValidator.equals(
    "deleted_at is null for new account",
    output.deleted_at,
    null,
  );
}
