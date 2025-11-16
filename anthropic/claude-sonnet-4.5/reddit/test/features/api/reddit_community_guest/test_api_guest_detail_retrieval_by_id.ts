import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving complete detailed information about a specific guest visitor
 * by their unique identifier.
 *
 * This test validates that moderators can access comprehensive guest session
 * data for individual visitors, including session identifiers, browsing
 * activity, temporal information, and associated metadata. The test
 * authenticates as a moderator, then requests a specific guest record using a
 * valid UUID in the path parameter.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a valid guest UUID identifier
 * 3. Retrieve guest details using the authenticated moderator connection
 * 4. Validate the response contains complete guest entity with all fields
 */
export async function test_api_guest_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a valid guest UUID identifier
  const guestId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve guest details using authenticated moderator connection
  const guestDetails: IRedditCommunityGuest =
    await api.functional.redditCommunity.moderator.guests.at(connection, {
      guestId: guestId,
    });

  // Step 4: Validate response structure with complete type checking
  typia.assert(guestDetails);
}
