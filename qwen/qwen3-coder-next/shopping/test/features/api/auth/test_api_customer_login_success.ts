import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account through join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.customer.join(
    joinConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: "12345678",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://google.com/search",
        ip: "192.168.1.1",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Step 2: Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.shoppingMall.auth.customer.login(
    loginConnection,
    {
      body: {
        email: joinResponse.email,
        password: "12345678",
        href: "https://example.com/login",
        referrer: "https://google.com/search",
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Validate response structure
  TestValidator.equals(
    "customer ID matches",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email matches",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "display_name matches",
    loginResponse.display_name,
    joinResponse.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    loginResponse.phone_number,
    joinResponse.phone_number,
  );
  TestValidator.equals(
    "email_verified matches",
    loginResponse.email_verified,
    joinResponse.email_verified,
  );
  TestValidator.equals(
    "created_at matches",
    loginResponse.created_at,
    joinResponse.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loginResponse.updated_at,
    joinResponse.updated_at,
  );
  // Step 4: Validate customer summary
  TestValidator.equals(
    "customer.id matches",
    loginResponse.customer.id,
    joinResponse.customer.id,
  );
  TestValidator.equals(
    "customer.email matches",
    loginResponse.customer.email,
    joinResponse.customer.email,
  );
  // Step 5: Validate tokens structure
  TestValidator.equals(
    "access_token exists",
    loginResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh_token exists",
    loginResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "access token has reasonable length",
    loginResponse.token.access.length >= 50,
  );
  TestValidator.predicate(
    "refresh token has reasonable length",
    loginResponse.token.refresh.length >= 50,
  );
  // Step 6: Validate token expiration timestamps
  const now = new Date();
  const accessDate = new Date(loginResponse.token.expired_at);
  const refreshableDate = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token expires within 1 hour",
    accessDate.getTime() - now.getTime() <= 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "access token expires after 10 minutes",
    accessDate.getTime() - now.getTime() >= 10 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token is valid for at least 24 hours",
    refreshableDate.getTime() - now.getTime() >= 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token is not valid more than 30 days",
    refreshableDate.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000,
  );
  // Step 7: Validate token formats
  TestValidator.predicate(
    "access token format is JWT-like",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResponse.token.access,
    ),
  );
  TestValidator.predicate(
    "refresh token format is JWT-like",
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      loginResponse.token.refresh,
    ),
  );
}
