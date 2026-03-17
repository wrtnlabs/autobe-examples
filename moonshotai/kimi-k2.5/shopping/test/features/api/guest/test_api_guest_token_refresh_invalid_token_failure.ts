import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_invalid_token_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid guest session to establish baseline
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Attempt to refresh with an invalid/malformed refresh token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.httpError(
    "invalid refresh token rejection",
    [401, 403],
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
}
