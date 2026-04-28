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
 * Test customer session continuation via token refresh workflow.
 *
 * Validates the complete token refresh flow for seamless session continuation without re-authentication. A new customer account is registered to obtain initial authentication tokens including access and refresh tokens. The refresh token is then submitted to the refresh endpoint, and the system validates the token hash, checks session activity, and issues a new token pair.
 *
 * Special attention is given to verifying token rotation—ensuring both new access and new refresh tokens differ from the originals—and confirming that customer identity remains consistent across the refresh operation.
 *
 * 1. Customer registers with unique email, password, and session context.
 * 2. Validates initial IAuthorized response contains valid token pair.
 * 3. Customer refreshes authentication using the original refresh token.
 * 4. Validates new IAuthorized response with rotated tokens.
 * 5. Confirms customer identity (id, email) is consistent before and after refresh.
 */
export async function test_api_customer_session_continuation(
  connection: api.IConnection,
) {
  // 1. Register customer to obtain initial authentication tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(initialAuthorized);
  // 2. Validate initial token structure
  TestValidator.predicate(
    "initial access token present",
    initialAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token present",
    initialAuthorized.token.refresh.length > 0,
  );
  // 3. Refresh authentication using the original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuthorized = await authorize_customer_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: initialAuthorized.token.refresh,
      } satisfies IEcommercePlatformCustomer.IRefresh,
    },
  );
  typia.assert(refreshedAuthorized);
  // 4. Validate token rotation - new tokens must differ from originals
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuthorized.token.access,
    initialAuthorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuthorized.token.refresh,
    initialAuthorized.token.refresh,
  );
  // 5. Validate customer identity consistency across refresh
  TestValidator.equals(
    "customer id consistent",
    refreshedAuthorized.id,
    initialAuthorized.id,
  );
  TestValidator.equals(
    "customer email consistent",
    refreshedAuthorized.email,
    initialAuthorized.email,
  );
  // 6. Validate new token timestamps are valid
  TestValidator.predicate(
    "new access token has expiry",
    refreshedAuthorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "new refresh token has deadline",
    refreshedAuthorized.token.refreshable_until.length > 0,
  );
}
