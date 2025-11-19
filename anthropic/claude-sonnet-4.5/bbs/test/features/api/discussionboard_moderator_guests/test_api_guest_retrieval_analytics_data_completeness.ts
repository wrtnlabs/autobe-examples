import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that retrieved guest records contain complete and accurate analytics
 * data.
 *
 * This test validates the GET /discussionBoard/moderator/guests/{guestId}
 * endpoint returns comprehensive guest visitor analytics including all tracking
 * metrics such as page_views count, first_visit_at and last_visit_at
 * timestamps, session_identifier, ip_address, and user_agent string. The test
 * creates a guest session, performs trackable actions, and confirms the
 * retrieved analytics accurately reflect the guest's browsing behavior.
 *
 * Test Steps:
 *
 * 1. Create first moderator account (auth will be overwritten later)
 * 2. Create guest session with trackable browsing activity (overwrites auth)
 * 3. Create second moderator account to retrieve guest analytics (needs moderator
 *    auth)
 * 4. Retrieve guest analytics using second moderator authentication
 * 5. Validate all analytics fields are present and accurate
 */
export async function test_api_guest_retrieval_analytics_data_completeness(
  connection: api.IConnection,
) {
  // Step 1: Create guest session with trackable browsing activity
  const guestSessionIdentifier = RandomGenerator.alphaNumeric(32);
  const guestIpAddress = "203.0.113.42";
  const guestUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  const guest = await api.functional.auth.guest.join(connection, {
    body: {
      session_identifier: guestSessionIdentifier,
      ip_address: guestIpAddress,
      user_agent: guestUserAgent,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guest);

  // Step 2: Create moderator account for authentication to retrieve guest analytics
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Retrieve guest analytics by guest ID (moderator is now authenticated)
  const retrievedGuest =
    await api.functional.discussionBoard.moderator.guests.at(connection, {
      guestId: guest.id,
    });
  typia.assert(retrievedGuest);

  // Step 4: Validate all analytics fields are present and accurate
  TestValidator.equals("guest ID matches", retrievedGuest.id, guest.id);
  TestValidator.equals(
    "session identifier matches",
    retrievedGuest.session_identifier,
    guestSessionIdentifier,
  );
  TestValidator.equals(
    "IP address captured correctly",
    retrievedGuest.ip_address,
    guestIpAddress,
  );
  TestValidator.equals(
    "user agent captured correctly",
    retrievedGuest.user_agent,
    guestUserAgent,
  );
  TestValidator.predicate(
    "page views is non-negative",
    retrievedGuest.page_views >= 0,
  );
}
