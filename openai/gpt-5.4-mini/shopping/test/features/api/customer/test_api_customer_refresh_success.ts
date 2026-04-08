import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify customer authentication refresh flow after sign-up.
 *
 * This scenario validates that a customer can obtain a valid refresh token
 * through registration, then exchange it for a fresh authorization payload
 * through the refresh endpoint. It ensures identity fields remain stable,
 * token lifecycle fields are renewed, and the refresh response keeps the same
 * account state while rotating credentials.
 *
 * 1. Register a new customer and capture the issued authorization payload.
 * 2. Refresh the customer session using the issued refresh token.
 * 3. Validate that the refreshed identity matches the original account.
 * 4. Confirm the access token, refresh token, and expiration metadata are
 *    renewed as part of token rotation.
 */
export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphaNumeric(12)}@test.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const originalToken = joined.token;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: {
      refreshToken: originalToken.refresh,
    } satisfies IMallPlatformCustomer.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("customer id preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "customer email preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "customer status preserved",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "customer created_at preserved",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "customer deleted_at preserved",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    originalToken.refresh,
  );
  TestValidator.notEquals(
    "access expiration renewed",
    refreshed.token.expired_at,
    originalToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline renewed",
    refreshed.token.refreshable_until,
    originalToken.refreshable_until,
  );
}
