import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test successful guest user registration with valid session tracking data.
 *
 * This test validates that anonymous users can create temporary guest accounts
 * by providing required connection metadata (IP address, current page URL, and
 * referrer URL). The test verifies that the system creates a new guest record
 * in the discussion_board_guests table, generates a unique UUID identifier, and
 * issues both access and refresh JWT tokens.
 *
 * Steps:
 *
 * 1. Generate valid guest registration request data with IP, href, and referrer
 * 2. Call the guest registration API endpoint
 * 3. Validate that the response structure matches
 *    IDiscussionBoardGuest.IAuthorized
 */
export async function test_api_guest_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid guest registration request data
  const requestBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  // Step 2: Call the guest registration API endpoint
  const guestAuthorized: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Step 3: Validate the complete response structure
  // This validates EVERYTHING: UUID format, date-time formats, all types and constraints
  typia.assert(guestAuthorized);
}
