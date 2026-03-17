import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account to establish initial session
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  // 2. Attempt to refresh with tampered/invalidated token
  // This simulates an expired session state where the refresh token is no longer valid
  // In production, this would occur when refreshable_until timestamp has passed
  await TestValidator.error("expired session cannot be refreshed", async () => {
    await api.functional.redditClone.auth.guest.refresh(connection, {
      body: {
        refresh_token: "expired_" + guestAuth.token.refresh,
      } satisfies IRedditCloneGuest.IRefresh,
    });
  });
  // 3. Verify that new guest account creation still works (re-authentication path)
  const newGuestAuth = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(newGuestAuth);
}
