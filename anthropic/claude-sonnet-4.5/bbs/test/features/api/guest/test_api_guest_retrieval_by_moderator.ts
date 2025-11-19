import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that a moderator can successfully retrieve detailed guest visitor
 * information by guest ID.
 *
 * This test validates the complete workflow of creating a guest visitor
 * session, authenticating as a moderator, and then fetching comprehensive guest
 * analytics data. It ensures moderators have proper access to visitor analytics
 * including session tracking, IP addresses, user agents, visit timestamps, and
 * page view metrics for traffic analysis and security monitoring.
 *
 * Workflow:
 *
 * 1. Create a guest visitor session to generate analytics record
 * 2. Create and authenticate moderator account
 * 3. Retrieve guest record by ID using moderator credentials
 * 4. Validate all guest analytics fields are properly returned
 */
export async function test_api_guest_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create guest visitor session
  const guestSessionIdentifier = typia.random<string>();
  const guestUserAgent = typia.random<string>();
  const guestIpAddress = typia.random<string>();

  const createdGuest = await api.functional.auth.guest.join(connection, {
    body: {
      session_identifier: guestSessionIdentifier,
      user_agent: guestUserAgent,
      ip_address: guestIpAddress,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(createdGuest);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<string>();
  const moderatorPassword = typia.random<string>();
  const moderatorHref = typia.random<string & tags.Format<"uri">>();
  const moderatorReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Retrieve guest record by ID using moderator credentials
  const retrievedGuest =
    await api.functional.discussionBoard.moderator.guests.at(connection, {
      guestId: createdGuest.id,
    });
  typia.assert(retrievedGuest);

  // Step 4: Validate retrieved guest matches created guest
  TestValidator.equals("guest ID matches", retrievedGuest.id, createdGuest.id);
  TestValidator.equals(
    "session identifier matches",
    retrievedGuest.session_identifier,
    createdGuest.session_identifier,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedGuest.ip_address,
    createdGuest.ip_address,
  );
  TestValidator.equals(
    "user agent matches",
    retrievedGuest.user_agent,
    createdGuest.user_agent,
  );
  TestValidator.equals(
    "first visit timestamp matches",
    retrievedGuest.first_visit_at,
    createdGuest.first_visit_at,
  );
  TestValidator.equals(
    "last visit timestamp matches",
    retrievedGuest.last_visit_at,
    createdGuest.last_visit_at,
  );
  TestValidator.equals(
    "page views matches",
    retrievedGuest.page_views,
    createdGuest.page_views,
  );
  TestValidator.equals(
    "created timestamp matches",
    retrievedGuest.created_at,
    createdGuest.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches",
    retrievedGuest.updated_at,
    createdGuest.updated_at,
  );
}
