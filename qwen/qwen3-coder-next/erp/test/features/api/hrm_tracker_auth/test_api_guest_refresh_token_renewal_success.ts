import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_renewal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join guest to obtain initial tokens
  const initialConnection: api.IConnection = { host: connection.host };
  const initialAuth: IHrmTrackerGuest.IAuthorized = await authorize_guest_join(
    initialConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16) as string &
          tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmTrackerGuest.IJoin,
    },
  );
  typia.assert(initialAuth);
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Refresh tokens using valid refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const renewedAuth: IHrmTrackerGuest.IAuthorized =
    await authorize_guest_refresh(refreshedConnection, {
      body: {
        device_fingerprint: initialAuth.device_fingerprint,
        refresh_token: originalRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmTrackerGuest.IRefresh,
    });
  typia.assert(renewedAuth);
  // 3. Validate response structure
  TestValidator.equals("guest ID matches", renewedAuth.id, initialAuth.id);
  TestValidator.equals(
    "device fingerprint matches",
    renewedAuth.device_fingerprint,
    initialAuth.device_fingerprint,
  );
  TestValidator.equals(
    "has new access token",
    typeof renewedAuth.token.access,
    "string",
  );
  TestValidator.equals(
    "has new refresh token",
    typeof renewedAuth.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token has expiration",
    new Date(renewedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has expiration",
    new Date(renewedAuth.token.refreshable_until) > new Date(),
  );
  // 4. Confirm token rotation
  TestValidator.notEquals(
    "access token rotated",
    renewedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    renewedAuth.token.refresh,
    initialAuth.token.refresh,
  );
}
