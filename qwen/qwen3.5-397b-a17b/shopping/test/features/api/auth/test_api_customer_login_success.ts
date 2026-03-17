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
 * Test successful customer login with valid email and password credentials.
 *
 * This test validates the complete customer authentication flow:
 * 1. Registers a new customer account with valid credentials
 * 2. Logs in with the same credentials
 * 3. Verifies the response contains all required fields including JWT tokens
 * 4. Confirms customer information matches between registration and login
 * 5. Validates the access token is properly configured for authenticated requests
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare customer credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: email,
      password: password,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate customer information matches
  TestValidator.equals("customer ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "nickname matches",
    loginResult.nickname,
    joinResult.nickname,
  );
  TestValidator.equals(
    "phone number matches",
    loginResult.phone_number,
    joinResult.phone_number,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  // 6. Validate customer summary matches
  TestValidator.equals(
    "customer summary ID",
    loginResult.customer.id,
    loginResult.id,
  );
  TestValidator.equals(
    "customer summary email",
    loginResult.customer.email,
    loginResult.email,
  );
  TestValidator.equals(
    "customer summary nickname",
    loginResult.customer.nickname,
    loginResult.nickname,
  );
  TestValidator.equals(
    "customer summary phone",
    loginResult.customer.phone_number,
    loginResult.phone_number,
  );
  // 7. Validate account is active (not deleted)
  TestValidator.equals("account not deleted", loginResult.deleted_at, null);
  TestValidator.equals(
    "customer summary not deleted",
    loginResult.customer.deleted_at,
    null,
  );
  // 8. Validate connection has authorization header set
  TestValidator.predicate(
    "authorization header set",
    loginConnection.headers?.Authorization !== undefined,
  );
}
