import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that the detailed guest information includes comprehensive activity and
 * reputation metrics.
 *
 * This test verifies that the guest detail response provides all karma and
 * activity statistics including total_posts, total_comments, post_karma,
 * comment_karma, and total_karma fields. The test authenticates as a moderator,
 * retrieves a specific guest record, and validates that all required metric
 * fields are present in the response with appropriate data types (integers for
 * counts and karma values). It also verifies that the karma calculations are
 * consistent, such as total_karma being the sum of post_karma and
 * comment_karma. This ensures administrators have complete visibility into
 * guest contribution patterns and community engagement.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve guest details using a valid guest ID
 * 3. Validate response structure with typia.assert
 * 4. Verify karma calculation consistency
 */
export async function test_api_guest_detail_with_activity_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve guest details using a randomly generated guest ID
  const guestId = typia.random<string & tags.Format<"uuid">>();
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.moderator.guests.at(connection, {
      guestId: guestId,
    });

  // Step 3: Validate response structure with typia.assert (validates ALL types and constraints)
  typia.assert(guest);

  // Step 4: Verify karma calculation consistency
  const expectedTotalKarma = guest.post_karma + guest.comment_karma;
  TestValidator.equals(
    "total_karma should equal post_karma + comment_karma",
    guest.total_karma,
    expectedTotalKarma,
  );
}
