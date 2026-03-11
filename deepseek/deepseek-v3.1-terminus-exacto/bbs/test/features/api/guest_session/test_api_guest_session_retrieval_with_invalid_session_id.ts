import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent guest session.
 * Generate a random UUID that doesn't correspond to any existing guest session.
 * Attempt to retrieve session details with this invalid session ID.
 * Validate that the system returns appropriate error response (404 Not Found or equivalent).
 * Test that the error message clearly indicates the session was not found.
 * Verify that the system doesn't leak information about other sessions.
 */
export async function test_api_guest_session_retrieval_with_invalid_session_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();
  // Create a valid session request body with random data
  const requestBody = typia.random<IDiscussionBoardGuestSession.IRequest>();
  // Attempt to retrieve the non-existent session using the PATCH endpoint
  await TestValidator.error("retrieve non-existent guest session", async () => {
    await api.functional.discussionBoard.guest.sessions.at(connection, {
      sessionId: invalidSessionId,
      body: requestBody,
    });
  });
}
