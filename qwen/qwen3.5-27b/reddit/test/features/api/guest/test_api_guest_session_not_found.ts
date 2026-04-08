import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test error handling when retrieving a non-existent guest session.
 *
 * Validates that the guest session retrieval endpoint properly handles requests for sessions that do not exist in the system. The test generates a valid UUID format that is guaranteed not to correspond to any actual session and verifies the API returns an appropriate HTTP 404 Not Found error.
 *
 * This test ensures the API correctly rejects invalid session lookups and provides proper error responses for missing resources.
 *
 * 1. Create a guest-specific connection from the base connection
 * 2. Generate a valid UUID format that does not correspond to any existing session
 * 3. Call the guest session retrieval endpoint with this non-existent sessionId
 * 4. Verify the response throws an HTTP error with status 404 Not Found
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate a valid UUID that does not exist
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Call endpoint and verify HTTP 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () =>
      await api.functional.redditClone.guest.guest.sessions.at(
        guestConnection,
        { sessionId: nonExistentSessionId },
      ),
  );
}
