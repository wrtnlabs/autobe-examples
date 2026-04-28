import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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
 * Test customer authentication token refresh with token rotation security.
 *
 * Validates the complete token refresh lifecycle by first registering a new customer account to obtain initial JWT authentication tokens. The initial refresh token is then extracted and submitted to the refresh endpoint to obtain renewed tokens.
 *
 * The test confirms token rotation security by verifying that both the access token and refresh token are replaced with new values after refresh, ensuring old tokens cannot be reused. The customer identity remains consistent across token refresh operations.
 *
 * 1. Customer registers via authorize_customer_join, receiving initial IAuthorized response with JWT tokens.
 * 2. Initial access and refresh tokens are extracted from the authorization response.
 * 3. Token refresh is performed via authorize_customer_refresh using the initial refresh token.
 * 4. New access token is validated to differ from the initial access token.
 * 5. New refresh token is validated to differ from the initial refresh token.
 * 6. Customer identity (id) remains consistent after token refresh.
 */
export async function test_api_customer_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Refresh tokens using the initial refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies IEcommercePlatformCustomer.IRefresh;
  const refreshedAuth = await authorize_customer_refresh(refreshedConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation - access token must change
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  // 4. Validate token rotation - refresh token must change
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 5. Customer identity remains consistent
  TestValidator.equals(
    "customer id unchanged",
    refreshedAuth.id,
    initialAuth.id,
  );
}
