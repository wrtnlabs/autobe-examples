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
 * Test successful customer registration with required fields only.
 *
 * Validates the complete customer registration flow using only the mandatory
 * fields: email, password, display name, originating page URL (href), and HTTP
 * referrer. The optional phone_number field is deliberately omitted to verify
 * that the registration succeeds without it and the response correctly returns
 * null for the unprovided field.
 *
 * The test verifies that the response contains a valid IShoppingMallCustomer.IAuthorized
 * structure with correct field mappings, proper token pair issuance, and accurate
 * timestamp relationships between account creation and token expiration.
 *
 * 1. Prepare registration data with required fields only, omitting phone_number.
 * 2. Call the join endpoint to register the customer.
 * 3. Validate response type structure via typia.assert.
 * 4. Verify email and display_name match submitted values.
 * 5. Confirm phone_number, banned_at, deleted_at are null.
 * 6. Confirm created_at equals updated_at for new account.
 * 7. Validate token pair: non-empty, distinct access and refresh tokens.
 * 8. Verify token.expired_at is approximately 15 minutes after created_at.
 * 9. Verify token.refreshable_until is approximately 7 days after created_at.
 */
export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration data with required fields only
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  // 2. Register customer
  const customer = await api.functional.shoppingMall.auth.customer.join(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(customer);
  // 3. Validate response fields match input
  TestValidator.equals("email matches input", customer.email, body.email);
  TestValidator.equals(
    "display_name matches input",
    customer.display_name,
    body.display_name,
  );
  // 4. Validate null fields for new account
  TestValidator.equals("phone_number is null", customer.phone_number, null);
  TestValidator.equals("banned_at is null", customer.banned_at, null);
  TestValidator.equals("deleted_at is null", customer.deleted_at, null);
  // 5. Validate created_at equals updated_at (no modifications yet)
  TestValidator.equals(
    "created_at equals updated_at",
    customer.created_at,
    customer.updated_at,
  );
  // 6. Validate token pair
  TestValidator.predicate(
    "access token is non-empty",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    customer.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens are distinct",
    customer.token.access,
    customer.token.refresh,
  );
  // 7. Validate token expiration timestamps
  const createdAt = new Date(customer.created_at);
  const expiredAt = new Date(customer.token.expired_at);
  const refreshableUntil = new Date(customer.token.refreshable_until);
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const TOLERANCE = 10000; // 10 seconds tolerance for server processing
  TestValidator.predicate(
    "expired_at is ~15 minutes after created_at",
    Math.abs(expiredAt.getTime() - createdAt.getTime() - FIFTEEN_MINUTES) <
      TOLERANCE,
  );
  TestValidator.predicate(
    "refreshable_until is ~7 days after created_at",
    Math.abs(refreshableUntil.getTime() - createdAt.getTime() - SEVEN_DAYS) <
      TOLERANCE,
  );
}
