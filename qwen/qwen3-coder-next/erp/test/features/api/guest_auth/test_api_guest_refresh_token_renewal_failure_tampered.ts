import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_token_renewal_failure_tampered(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest account to get valid tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmTrackerGuest.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Tamper the refresh token by modifying it
  const tamperedRefreshToken = "tampered_" + authorized.token.refresh;
  // Step 3: Attempt refresh with tampered token
  await TestValidator.error(
    "should reject tampered refresh token",
    async () => {
      const tamperedConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(tamperedConnection, {
        body: {
          device_fingerprint: authorized.device_fingerprint,
          refresh_token: tamperedRefreshToken satisfies string &
            tags.Format<"password">,
        } satisfies IHrmTrackerGuest.IRefresh,
      });
    },
  );
}
