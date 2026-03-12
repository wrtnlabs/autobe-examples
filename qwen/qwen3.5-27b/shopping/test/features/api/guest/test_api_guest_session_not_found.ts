import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that attempting to retrieve a non-existent guest session returns 404 error.
 * 1. Authenticate as a guest using POST /shoppingMall/auth/guest/join
 * 2. Generate a valid UUID that does not exist in the database
 * 3. Call GET /shoppingMall/guest/sessions/{sessionId} with non-existent session ID
 * 4. Verify the response returns HTTP 404 Not Found status
 * 5. Ensure guest authentication remains valid after the failed attempt
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  // 2. Generate a non-existent session ID (valid UUID format but doesn't exist)
  const nonExistentSessionId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent session and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent guest session",
    404,
    async () =>
      await api.functional.shoppingMall.guest.sessions.at(guestConnection, {
        sessionId: nonExistentSessionId,
      }),
  );
  // 4. Verify guest authentication remains valid after 404 error
  // Make another call to ensure tokens are still working
  const anotherNonExistentId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "authentication remains valid after 404 error",
    404,
    async () =>
      await api.functional.shoppingMall.guest.sessions.at(guestConnection, {
        sessionId: anotherNonExistentId,
      }),
  );
}
