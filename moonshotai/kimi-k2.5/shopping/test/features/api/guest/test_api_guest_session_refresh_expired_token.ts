import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain a valid refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(joinConnection, {
    body: {
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(authorized);
  // Store refresh token and expiration time
  const refreshToken = authorized.token.refresh;
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  // 2. Simulate passage of time beyond the refresh token expiration
  // Note: Test environment should configure short token expiration (e.g., 1-2 seconds)
  const now = new Date();
  const timeUntilExpiration = refreshableUntil.getTime() - now.getTime();
  // Wait if token hasn't expired yet (with 100ms buffer)
  if (timeUntilExpiration > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, timeUntilExpiration + 100),
    );
  }
  // 3. Attempt to refresh with the expired token and verify 401 error
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 401 for expired refresh token",
    401,
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: refreshToken,
          href: typia.random<string & typia.tags.Format<"uri">>(),
          referrer: typia.random<string & typia.tags.Format<"uri">>(),
          ip: null,
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
