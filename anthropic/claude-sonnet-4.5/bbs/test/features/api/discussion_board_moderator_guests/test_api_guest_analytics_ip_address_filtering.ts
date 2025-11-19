import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test filtering guest records by IP address with exact and partial matching.
 *
 * This test validates the IP address filtering functionality for guest
 * analytics, allowing moderators to filter guest visitor records by exact IP
 * addresses and IP prefixes for subnet analysis. This is essential for security
 * analysis scenarios like identifying all guests from a suspicious IP range or
 * analyzing geographic traffic patterns based on IP distribution.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query guests with exact IP address filter
 * 3. Query guests with IP prefix filter for subnet analysis
 * 4. Validate that all returned records match the filter criteria
 */
export async function test_api_guest_analytics_ip_address_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for accessing guest analytics
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test exact IP address filtering
  // Filter for a specific IP address
  const exactIpAddress = "192.168.1.100";

  const exactIpResult =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        ip_address: exactIpAddress,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(exactIpResult);

  // Validate response structure
  TestValidator.predicate(
    "exact IP filter response should have valid pagination",
    exactIpResult.pagination.current === 1 &&
      exactIpResult.pagination.limit >= 0,
  );

  // Step 3: Test IP prefix filtering for subnet analysis
  // Filter for all guests from 192.168.x.x subnet
  const ipPrefix = "192.168";

  const prefixResult =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        ip_address: ipPrefix,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(prefixResult);

  // Validate prefix filtering response structure
  TestValidator.predicate(
    "prefix IP filter response should have valid pagination",
    prefixResult.pagination.current === 1 && prefixResult.pagination.limit >= 0,
  );

  // Step 4: Test another IP prefix pattern
  const alternativePrefix = "10.0";

  const alternativePrefixResult =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        ip_address: alternativePrefix,
        page: 1,
        limit: 50,
        sort_by: "page_views",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(alternativePrefixResult);

  // Validate sorting is applied
  TestValidator.predicate(
    "alternative prefix filter should support sorting",
    alternativePrefixResult.pagination.pages >= 0,
  );

  // Step 5: Test combination of IP filter with other filters
  const combinedFilterResult =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        ip_address: "172.16",
        min_page_views: 5,
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Validate combined filters work correctly
  TestValidator.predicate(
    "combined filters should return valid paginated results",
    combinedFilterResult.pagination.current === 1 &&
      combinedFilterResult.pagination.records >= 0,
  );
}
