import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test retrieval of guest session information by unique identifier.
 *
 * This E2E test validates that guest session details including session token,
 * creation timestamp, and status information can be successfully retrieved.
 * Tests proper handling of guest session lookup and ensures session data
 * integrity is maintained throughout the retrieval process.
 */
export async function test_api_guest_session_retrieval(
  connection: api.IConnection,
) {
  // Generate a valid guest ID using UUID format
  const guestId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;

  // Call the API endpoint to retrieve guest session information
  const guestSession = await api.functional.communityPlatform.guests.at(
    connection,
    {
      guestId: guestId,
    },
  );

  // Validate the response structure matches the expected DTO type
  typia.assert(guestSession);

  // Verify that all required fields are present and properly formatted
  TestValidator.equals(
    "retrieved guest session ID matches requested ID",
    guestSession.id,
    guestId,
  );
  TestValidator.predicate(
    "session token is present and non-empty",
    guestSession.session_token.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestSession.created_at),
  );
  TestValidator.predicate(
    "updated at timestamp follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(guestSession.updated_at),
  );
}
