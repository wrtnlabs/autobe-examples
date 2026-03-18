import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsGuest.IJoin,
  });
  typia.assert(joined);
  // Store the refresh token from initial registration
  const initialRefreshToken = joined.refresh;
  const initialExpiredAt = joined.expired_at;
  // 2. Test token refresh with the stored refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await api.functional.hrms.auth.guest.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsGuest.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 3. Validate that refresh returned new tokens (not the same as before)
  TestValidator.notEquals(
    "access token rotated",
    refreshed.access,
    joined.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.refresh,
    initialRefreshToken,
  );
  // 4. Validate that guest identity remains the same
  TestValidator.equals("guest id unchanged", refreshed.id, joined.id);
  TestValidator.equals(
    "device fingerprint unchanged",
    refreshed.device_fingerprint,
    joined.device_fingerprint,
  );
  TestValidator.equals(
    "ip address unchanged",
    refreshed.ip_address,
    joined.ip_address,
  );
  TestValidator.equals(
    "user agent unchanged",
    refreshed.user_agent,
    joined.user_agent,
  );
  // 5. Validate new expired_at is a valid future date and different from before
  TestValidator.predicate("new expired_at is valid date-time", () => {
    const date = new Date(refreshed.expired_at);
    return date > new Date();
  });
  TestValidator.notEquals(
    "expired_at updated",
    refreshed.expired_at,
    initialExpiredAt,
  );
  // 6. Verify old refresh token cannot be reused (token rotation works correctly)
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "old refresh token cannot be reused",
    [401, 403],
    async () => {
      await api.functional.hrms.auth.guest.refresh(reuseConnection, {
        body: {
          refresh_token: initialRefreshToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IHrmsGuest.IRefresh,
      });
    },
  );
}
