import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Reject unusable administrator refresh tokens during session renewal.
 *
 * Verifies that the administrator refresh endpoint does not accept a refresh
 * token that is no longer usable for session renewal. The test first creates a
 * valid administrator session through the join flow, then attempts to refresh
 * with a clearly invalid token value that simulates an expired, revoked, or
 * detached refresh token.
 *
 * 1. Create an administrator session using the join flow on an isolated
 *    connection.
 * 2. Attempt to refresh the administrator session using an unusable refresh
 *    token.
 * 3. Assert that the refresh attempt fails and does not return a new
 *    authorization payload.
 */
export async function test_api_administrator_refresh_rejects_unusable_token(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const joined: IMallPlatformAdministrator.IAuthorized =
    await authorize_administrator_join(administratorConnection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` as string &
          typia.tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12) as string &
          typia.tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    });
  typia.assert(joined);
  const unusableRefreshToken: string = "unusable-refresh-token";
  await TestValidator.httpError(
    "administrator refresh should reject an unusable token",
    [400, 401, 403],
    async () => {
      await authorize_administrator_refresh(administratorConnection, {
        body: {
          refreshToken: unusableRefreshToken,
        } satisfies IMallPlatformAdministrator.IRefresh,
      });
    },
  );
}
