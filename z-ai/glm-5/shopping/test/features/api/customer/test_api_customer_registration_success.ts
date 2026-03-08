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
 *
 * Validates:
 * 1. Customer account creation with unique email
 * 2. Response includes JWT tokens (access, refresh) with valid expirations
 * 3. Customer profile contains correct fields (id, email, displayName, phoneNumber, banned, timestamps)
 * 4. Account is active by default (banned=false)
 * 5. Access token is set in connection headers for immediate use
 */
export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  // Register new customer using utility function
  const result = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      displayName,
      phoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(result);
  // Verify customer profile fields
  TestValidator.predicate(
    "customer id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.equals(
    "email matches input in lowercase",
    result.email,
    email.toLowerCase(),
  );
  TestValidator.equals(
    "displayName matches input",
    result.displayName,
    displayName,
  );
  TestValidator.equals(
    "phoneNumber matches input",
    result.phoneNumber,
    phoneNumber,
  );
  TestValidator.equals("account is active (not banned)", result.banned, false);
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    !isNaN(new Date(result.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    !isNaN(new Date(result.updatedAt).getTime()),
  );
  // Verify JWT tokens structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is future timestamp",
    new Date(result.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is future timestamp",
    new Date(result.token.refreshable_until).getTime() > Date.now(),
  );
  // Verify auto-login: connection has Authorization header set
  TestValidator.predicate(
    "access token set in connection headers",
    typeof customerConnection.headers?.Authorization === "string" &&
      customerConnection.headers.Authorization.length > 0,
  );
}