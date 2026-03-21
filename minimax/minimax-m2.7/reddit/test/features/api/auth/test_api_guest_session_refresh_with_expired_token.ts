import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid guest session to obtain tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.redditClone.auth.guest.join(
    guestConnection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  // Step 2: Attempt to refresh using an expired/invalid refreshToken
  // The system should reject the request with an appropriate error response
  const expiredRefreshToken =
    authorized.token.refresh.substring(0, 10) + "EXPIRED_TOKEN_SUFFIX";
  await TestValidator.httpError(
    "expired refresh token rejected",
    [400, 401, 403],
    async () =>
      api.functional.redditClone.auth.guest.refresh(guestConnection, {
        body: {
          refreshToken: expiredRefreshToken,
        },
      }),
  );
}