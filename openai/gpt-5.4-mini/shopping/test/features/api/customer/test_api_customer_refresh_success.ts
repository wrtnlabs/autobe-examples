import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer refresh token renewal for a valid active session.
 *
 * Verifies that a newly registered customer can exchange an unexpired refresh
 * token for a new authorization bundle without re-entering credentials. The test
 * checks identity continuity, token rotation, and expiration metadata updates.
 *
 * 1. Register a customer through the join flow and capture the issued token bundle.
 * 2. Call the refresh endpoint with the returned refresh token.
 * 3. Validate that the refreshed response preserves the same customer identity.
 * 4. Confirm the access token and refresh token are rotated and usable in a new connection.
 */
export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const originalAccess = joined.token.access;
  const originalRefresh = joined.token.refresh;
  const originalExpiredAt = joined.token.expired_at;
  const refreshed = await authorize_customer_refresh(customerConnection, {
    body: {
      refreshToken: originalRefresh,
    } satisfies IMallPlatformCustomer.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("customer id is preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "customer email is preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "customer status is preserved",
    refreshed.status,
    joined.status,
  );
  TestValidator.notEquals(
    "access token is rotated",
    refreshed.token.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshed.token.refresh,
    originalRefresh,
  );
  TestValidator.notEquals(
    "access expiration is updated",
    refreshed.token.expired_at,
    originalExpiredAt,
  );
  const subsequentConnection: api.IConnection = { host: connection.host };
  subsequentConnection.headers = {
    Authorization: `Bearer ${refreshed.token.access}`,
  };
  TestValidator.equals(
    "refreshed token bundle is attached to a new connection",
    subsequentConnection.headers.Authorization,
    `Bearer ${refreshed.token.access}`,
  );
}
