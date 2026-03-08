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

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session
  const guestJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!" satisfies string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    href: "https://example.com/dashboard" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardGuest.IJoin;
  const initialSession = await authorize_guest_join(connection, {
    body: guestJoinRequest,
  });
  typia.assert(initialSession);
  // Store initial session data for comparison
  const initialSessionToken = initialSession.session_token;
  const initialGuestId = initialSession.id;
  const initialExpiredAt = new Date(initialSession.expired_at).getTime();
  // Step 2: Wait a short period to simulate normal usage
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 3: Refresh the guest session
  const refreshRequest = {
    session_token: initialSessionToken satisfies string & tags.Format<"uuid">,
  } satisfies IDiscussionBoardGuest.IRefresh;
  const refreshedSession = await authorize_guest_refresh(connection, {
    body: refreshRequest,
  });
  typia.assert(refreshedSession);
  // Step 4: Verify response contains new access and refresh tokens
  TestValidator.notEquals(
    "new access token",
    refreshedSession.access,
    initialSession.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshedSession.refresh,
    initialSession.refresh,
  );
  // Step 5: Verify expired_at timestamp is extended
  const refreshedExpiredAt = new Date(refreshedSession.expired_at).getTime();
  TestValidator.predicate(
    "expired_at extended",
    refreshedExpiredAt > initialExpiredAt,
  );
  // Step 6: Verify the session token remains the same
  TestValidator.equals(
    "session_token unchanged",
    refreshedSession.session_token,
    initialSessionToken,
  );
  // Step 7: Verify the guest ID remains unchanged
  TestValidator.equals(
    "guest ID unchanged",
    refreshedSession.id,
    initialGuestId,
  );
}
