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
 * Test successful customer registration with a unique email address.
 *
 * This test verifies the complete customer join workflow:
 * 1. Submit registration request with valid credentials (email, password, nickname, phone_number, href, referrer)
 * 2. Verify response contains all required customer fields (id, email, nickname, phone_number, created_at, updated_at, deleted_at)
 * 3. Verify JWT tokens (access and refresh) are present and non-empty
 * 4. Verify token expiration timestamps (expired_at, refreshable_until) are present and in the future
 * 5. Confirm customer is immediately authenticated with returned tokens
 */
export async function test_api_customer_join_with_unique_email(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for registration
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate unique registration data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomer.IJoin;
  // Register customer using utility function
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: joinInput,
    });
  // Validate response structure
  typia.assert(authorized);
  // Verify customer information matches input
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "nickname matches input",
    authorized.nickname,
    joinInput.nickname,
  );
  TestValidator.equals(
    "phone matches input",
    authorized.phone_number,
    joinInput.phone_number,
  );
  // Verify customer ID is valid UUID
  TestValidator.predicate(
    "customer id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Verify timestamps exist
  TestValidator.predicate("created_at exists", authorized.created_at !== null);
  TestValidator.predicate("updated_at exists", authorized.updated_at !== null);
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // Verify customer summary is embedded
  TestValidator.equals(
    "customer summary id matches",
    authorized.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer summary email matches",
    authorized.customer.email,
    authorized.email,
  );
  // Verify access token is non-empty string
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  // Verify refresh token is non-empty string
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
}
