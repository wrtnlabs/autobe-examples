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

export async function test_api_guest_refresh_token_revoked_reuse_prevented(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session to obtain initial refresh_token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.erpHrm.auth.guest.join(
    guestConnection,
    {
      body: {
        deviceId: typia.random<string & tags.Format<"uuid">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmGuest.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Store the first refresh_token
  const firstRefreshToken = initialAuth.token.refresh;
  // 2. Call refresh once to get new token pair (old token revoked)
  const refreshedAuth = await api.functional.erpHrm.auth.guest.refresh(
    guestConnection,
    {
      body: {
        refresh_token: firstRefreshToken,
      } satisfies IErpHrmGuest.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 3. Attempt to call refresh again using the now-revoked first refresh_token
  // 4. Verify the second refresh attempt fails with authentication error
  await TestValidator.error(
    "revoked refresh_token cannot be reused",
    async () => {
      await api.functional.erpHrm.auth.guest.refresh(guestConnection, {
        body: {
          refresh_token: firstRefreshToken,
        } satisfies IErpHrmGuest.IRefresh,
      });
    },
  );
  // 5. Confirm that only the most recent valid refresh_token can be used
  // Try using the new refresh_token - this should succeed
  const secondRefreshAuth = await api.functional.erpHrm.auth.guest.refresh(
    guestConnection,
    {
      body: {
        refresh_token: refreshedAuth.token.refresh,
      } satisfies IErpHrmGuest.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Verify the new refresh_token is different from the old one
  TestValidator.notEquals(
    "new refresh_token is different",
    secondRefreshAuth.token.refresh,
    firstRefreshToken,
  );
}
