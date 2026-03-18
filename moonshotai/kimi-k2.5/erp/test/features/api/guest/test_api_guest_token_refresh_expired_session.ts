import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Initialize guest session to get valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Attempt to refresh with expired token should fail
  // The system should detect that the session has expired and reject the request
  await TestValidator.httpError(
    "refresh with expired session token should fail",
    [401, 403],
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refreshToken: authorized.token.refresh,
        } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
}
