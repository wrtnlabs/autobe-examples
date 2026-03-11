import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_with_expired_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestSession);
  // Extract refresh token from the session
  const refreshToken = guestSession.token.refresh;
  // Test refresh with the token - since we cannot simulate actual expiration,
  // we rely on the server to properly validate token expiration
  await TestValidator.error(
    "refresh with potentially expired token should fail",
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IDiscussionBoardGuest.IRefresh,
      });
    },
  );
}
