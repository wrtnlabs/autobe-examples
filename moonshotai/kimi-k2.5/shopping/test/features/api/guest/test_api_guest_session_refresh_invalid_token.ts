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

export async function test_api_guest_session_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain a valid session with legitimate refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {});
  typia.assert(guestSession);
  // 2. Test with completely random/invalid refresh token (never issued)
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.httpError(
    "should return 401 for random invalid refresh token",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: invalidRefreshToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
  // 3. Test with tampered/modified token (token manipulation attack)
  const tamperedToken = guestSession.token.refresh.slice(0, -5) + "XXXXX";
  await TestValidator.httpError(
    "should return 401 for tampered refresh token",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: tamperedToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
  // 4. Test token rotation - successful refresh should invalidate old token
  const newSession = await authorize_guest_refresh(guestConnection, {
    body: {
      refreshToken: guestSession.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(newSession);
  // Old refresh token should now be revoked (token rotation security)
  await TestValidator.httpError(
    "should return 401 for revoked refresh token after rotation",
    401,
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: guestSession.token.refresh, // Original token, now revoked
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
