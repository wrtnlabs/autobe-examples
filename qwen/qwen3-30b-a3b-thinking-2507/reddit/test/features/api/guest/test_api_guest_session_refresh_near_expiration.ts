import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_near_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizations: IRedditGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_id: typia.random<string & tags.Format<"uuid">>(),
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IRedditGuest.IJoin,
    },
  );
  typia.assert(authorizations);
  // 2. Wait until 2 minutes before expiration
  const expirationTime = new Date(authorizations.expired_at).getTime();
  const now = new Date().getTime();
  const waitDuration = Math.max(0, expirationTime - now - 120 * 1000); // 2 minutes before expiration
  if (waitDuration > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitDuration));
  }
  // 3. Make the refresh request
  const refreshedAuthorizations: IRedditGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: {} satisfies IRedditGuest.IRefresh,
    });
  typia.assert(refreshedAuthorizations);
  // 4. Verify the new expiration time is approximately 30 minutes from now
  const newExpirationTime = new Date(
    refreshedAuthorizations.expired_at,
  ).getTime();
  const timeDifference = newExpirationTime - Date.now();
  // 30 minutes in milliseconds
  const thirtyMinutesMs = 30 * 60 * 1000;
  // Verify the new expiration time
  TestValidator.predicate(
    "New session expiration should be approximately 30 minutes from now",
    timeDifference >= thirtyMinutesMs - 30 * 1000 &&
      timeDifference <= thirtyMinutesMs + 30 * 1000,
  );
}
