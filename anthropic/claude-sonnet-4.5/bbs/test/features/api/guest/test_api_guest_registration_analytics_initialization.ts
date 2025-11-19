import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that guest registration properly initializes all analytics-related
 * fields for tracking visitor behavior.
 *
 * This test validates the complete analytics infrastructure initialization
 * during guest session creation, ensuring that all tracking fields are properly
 * set for accurate visitor behavior analysis and conversion tracking.
 *
 * Steps:
 *
 * 1. Generate realistic guest registration data (session_identifier, user_agent,
 *    ip_address)
 * 2. Call the guest registration API endpoint
 * 3. Validate complete response structure with typia.assert
 * 4. Verify page_views is initialized to exactly 0
 * 5. Validate first_visit_at and last_visit_at are identical timestamps
 * 6. Ensure timestamps are in proper ISO 8601 format
 * 7. Confirm session_identifier and user_agent are properly stored
 * 8. Validate created_at and updated_at timestamps are set
 */
export async function test_api_guest_registration_analytics_initialization(
  connection: api.IConnection,
) {
  // Step 1: Generate realistic guest registration data
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();

  const requestBody = {
    session_identifier: sessionIdentifier,
    user_agent: userAgent,
    ip_address: ipAddress,
  } satisfies IDiscussionBoardGuest.ICreate;

  // Step 2: Call the guest registration API endpoint
  const guestResponse: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: requestBody,
    });

  // Step 3: Validate complete response structure with typia.assert
  typia.assert(guestResponse);

  // Capture current time AFTER receiving response for accurate comparison
  const now = new Date();

  // Step 4: Verify page_views is initialized to exactly 0
  TestValidator.equals(
    "page_views should be initialized to 0",
    guestResponse.page_views,
    0,
  );

  // Step 5: Validate first_visit_at and last_visit_at are identical timestamps
  TestValidator.equals(
    "first_visit_at and last_visit_at should be identical on registration",
    guestResponse.first_visit_at,
    guestResponse.last_visit_at,
  );

  // Step 6: Verify the timestamps are recent (within last 5 seconds)
  const firstVisitTime = new Date(guestResponse.first_visit_at);
  const timeDifferenceMs = Math.abs(now.getTime() - firstVisitTime.getTime());
  TestValidator.predicate(
    "first_visit_at should be recent (within 5 seconds)",
    timeDifferenceMs < 5000,
  );

  // Step 7: Confirm session_identifier and user_agent are properly stored
  TestValidator.equals(
    "session_identifier should match the provided value",
    guestResponse.session_identifier,
    sessionIdentifier,
  );
  TestValidator.equals(
    "user_agent should match the provided value",
    guestResponse.user_agent,
    userAgent,
  );
  TestValidator.equals(
    "ip_address should match the provided value",
    guestResponse.ip_address,
    ipAddress,
  );

  // Step 8: Verify created_at and updated_at are recent
  const createdAtTime = new Date(guestResponse.created_at);
  const updatedAtTime = new Date(guestResponse.updated_at);
  const createdAtDiff = Math.abs(now.getTime() - createdAtTime.getTime());
  const updatedAtDiff = Math.abs(now.getTime() - updatedAtTime.getTime());

  TestValidator.predicate(
    "created_at should be recent (within 5 seconds)",
    createdAtDiff < 5000,
  );
  TestValidator.predicate(
    "updated_at should be recent (within 5 seconds)",
    updatedAtDiff < 5000,
  );
}
