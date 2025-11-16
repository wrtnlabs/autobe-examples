import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test accessing guest details for security monitoring and investigation
 * purposes.
 *
 * This scenario validates that moderators can retrieve comprehensive guest
 * session data to analyze suspicious activity, investigate potential security
 * threats, or track problematic visitor patterns. The test authenticates as a
 * moderator, then retrieves a guest record to verify that the response includes
 * all necessary session tracking fields, activity timestamps, and metadata
 * required for thorough security analysis.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account with valid credentials
 * 2. Retrieve detailed guest information using a guest ID
 * 3. Validate the complete guest activity metrics structure via typia.assert
 */
export async function test_api_guest_detail_for_security_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a random guest ID and retrieve guest details
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guestDetails: IRedditCommunityGuest =
    await api.functional.redditCommunity.moderator.guests.at(connection, {
      guestId: guestId,
    });
  typia.assert(guestDetails);
}
