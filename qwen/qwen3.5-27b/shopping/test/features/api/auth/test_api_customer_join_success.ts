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
 * Test successful customer registration with valid credentials and immediate authentication.
 *
 * Validates the complete customer join workflow including account creation, profile initialization, and JWT token generation. Ensures that new customers receive proper authorization tokens and can immediately access authenticated features without approval delays.
 *
 * The test verifies that customer accounts are created with active status, associated profiles are initialized, and both access and refresh tokens are generated with appropriate expiration times.
 *
 * 1. Creates customer-specific connection from base connection.
 * 2. Registers new customer with valid email and password using utility function.
 * 3. Validates complete IAuthorized response structure with typia.assert().
 * 4. Verifies business logic: customer ID exists, email matches input, banned is false, deleted_at is null.
 * 5. Confirms profile object exists with display_name.
 * 6. Validates token expiration times are within expected ranges.
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Register new customer with valid credentials
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Validate complete response structure
  typia.assert(customer);
  // 4. Verify business logic validations
  TestValidator.predicate("customer ID exists", customer.id.length > 0);
  TestValidator.predicate("banned is false", customer.banned === false);
  TestValidator.equals("deleted_at is null", customer.deleted_at, null);
  TestValidator.predicate("profile exists", customer.profile !== null);
  TestValidator.predicate(
    "profile has display_name",
    customer.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    customer.token.refresh.length > 0,
  );
  // 5. Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(customer.token.expired_at);
  const refreshableUntil = new Date(customer.token.refreshable_until);
  // Access token should expire in ~15 minutes (900 seconds)
  const accessExpiryMinutes = (expiredAt.getTime() - now.getTime()) / 1000 / 60;
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessExpiryMinutes > 10 && accessExpiryMinutes < 20,
  );
  // Refresh token should be valid for ~7 days (604800 seconds)
  const refreshExpiryDays =
    (refreshableUntil.getTime() - now.getTime()) / 1000 / 60 / 60 / 24;
  TestValidator.predicate(
    "refresh token valid for ~7 days",
    refreshExpiryDays > 6 && refreshExpiryDays < 8,
  );
}
