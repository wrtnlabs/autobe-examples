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

export async function test_api_guest_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish a new guest session via join to obtain tokens
  const guestJoin: IEcommerceMallGuest.IAuthorized = await authorize_guest_join(
    connection,
    {},
  );
  // 2. Extract the refresh token from the join response
  const refreshToken: string = guestJoin.token.refresh;
  const originalGuestId: string = guestJoin.id;
  // 3. Call POST /ecommerceMall/auth/guest/refresh with valid refresh token
  const refreshedSession: IEcommerceMallGuest.IAuthorized =
    await authorize_guest_refresh(connection, {
      body: {
        refreshToken: refreshToken,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  // 4. Validate the refreshed session response
  typia.assert(refreshedSession);
  // 5. Verify response contains access token
  TestValidator.predicate(
    "access token exists",
    refreshedSession.token.access.length > 0,
  );
  // 6. Verify expired_at timestamp is in the future
  const expiredAtDate: Date = new Date(refreshedSession.token.expired_at);
  const now: Date = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtDate.getTime() > now.getTime(),
  );
  // 7. Verify refreshable_until timestamp is in the future (session max duration)
  const refreshableUntilDate: Date = new Date(
    refreshedSession.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilDate.getTime() > now.getTime(),
  );
  // 8. Verify refreshable_until is after expired_at (refresh window is valid)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
  // 9. Verify guest session ID remains the same for session continuity
  TestValidator.equals(
    "guest session ID preserved after refresh",
    refreshedSession.id,
    originalGuestId,
  );
}
