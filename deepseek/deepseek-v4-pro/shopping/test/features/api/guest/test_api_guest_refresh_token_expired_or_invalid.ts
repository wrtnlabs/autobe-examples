import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh failure with expired, invalid, or tampered refresh tokens.
 *
 * Validates the security boundary that prevents unauthorized session extension through the refresh endpoint. When a guest provides an invalid refresh token — whether tampered, expired, or belonging to a non-existent session — the system must reject the request with a 401 Unauthorized status, preventing any unauthorized access to authenticated resources.
 *
 * The test also verifies that after a failed refresh attempt, the guest can still re-establish their identity through the join endpoint using a device fingerprint. This confirms that the security rejection is isolated to the invalid token and does not block legitimate access paths.
 *
 * 1. A guest registers via the join endpoint, obtaining a valid JWT token pair with access and refresh tokens.
 * 2. The guest attempts to refresh using a completely invalid/tampered refresh token string that cannot be decoded as a valid JWT.
 * 3. The system rejects the refresh request with 401 Unauthorized, preventing unauthorized session extension.
 * 4. The guest successfully re-establishes identity through the join endpoint, confirming continued legitimate access.
 */
export async function test_api_guest_refresh_token_expired_or_invalid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest via join to obtain valid token pair
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Attempt refresh with tampered/invalid refresh token
  const tamperedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("tampered refresh token", 401, async () => {
    await authorize_guest_refresh(tamperedConnection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(64),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallGuest.IRefresh,
    });
  });
  // 3. Guest can still re-join to confirm legitimate access path remains
  const rejoinConnection: api.IConnection = { host: connection.host };
  const reauthorized = await authorize_guest_join(rejoinConnection, {});
  typia.assert(reauthorized);
}
