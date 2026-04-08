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

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialSession);
  // 2. Refresh the session with updated context
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: initialSession.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // 3. Verify token rotation - new tokens should be different from old
  TestValidator.notEquals(
    "access token should be rotated",
    initialSession.token.access,
    refreshedSession.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    initialSession.token.refresh,
    refreshedSession.token.refresh,
  );
  // 4. Verify expiration timestamps are updated
  TestValidator.notEquals(
    "expired_at should be updated",
    initialSession.token.expired_at,
    refreshedSession.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated",
    initialSession.token.refreshable_until,
    refreshedSession.token.refreshable_until,
  );
  // 5. Verify new tokens are functional by using the new refresh token
  const functionalConnection: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(functionalConnection, {
    body: {
      refreshToken: refreshedSession.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(secondRefresh);
  // 6. Verify old refresh token is invalidated
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      await authorize_guest_refresh(reuseConnection, {
        body: {
          refreshToken: initialSession.token.refresh,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
