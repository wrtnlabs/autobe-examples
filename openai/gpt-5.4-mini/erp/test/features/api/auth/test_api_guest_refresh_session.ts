import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_session(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {
      href: "https://example.com/guest/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeGuestSession.IJoin,
  });
  typia.assert(joined);
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refreshToken: joined.refresh,
    } satisfies IErpHrmTimeGuestSession.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.notEquals(
    "refresh should rotate access token",
    joined.access,
    refreshed.access,
  );
  TestValidator.notEquals(
    "refresh should rotate refresh token",
    joined.refresh,
    refreshed.refresh,
  );
  TestValidator.predicate(
    "refreshed access token should not be empty",
    refreshed.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should not be empty",
    refreshed.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expiration should be updated",
    new Date(refreshed.expiredAt).getTime() >=
      new Date(joined.expiredAt).getTime(),
  );
  TestValidator.equals(
    "guest authorization token should remain structurally valid",
    refreshed.token,
    joined.token,
  );
  const revokedGuestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(revokedGuestConnection, {
    body: {
      href: "https://example.com/guest/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeGuestSession.IJoin,
  });
  await TestValidator.httpError(
    "invalid guest refresh token should be rejected",
    [400, 401, 403],
    async () => {
      await authorize_guest_refresh(revokedGuestConnection, {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(32),
        } satisfies IErpHrmTimeGuestSession.IRefresh,
      });
    },
  );
}
