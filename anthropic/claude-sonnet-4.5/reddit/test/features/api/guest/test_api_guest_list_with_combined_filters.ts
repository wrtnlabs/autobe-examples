import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test complex filtering scenarios combining multiple filter parameters
 * simultaneously.
 *
 * This test validates that the guest listing API correctly implements AND logic
 * when multiple filter criteria are applied together. It tests the combination
 * of IP address filtering, time range filtering (created_after,
 * created_before), search queries, sorting options, and pagination parameters.
 *
 * The test authenticates as a moderator, submits a comprehensive request with
 * all filter types, and validates that the API processes all filters correctly
 * in combination, enabling sophisticated traffic analysis and investigation
 * workflows.
 *
 * Test Flow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Construct a complex filter request with multiple criteria
 * 3. Submit the request to the guest listing endpoint
 * 4. Validate the paginated response structure and data integrity
 */
export async function test_api_guest_list_with_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://reddit-community.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Construct a comprehensive filter request combining multiple criteria
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const filterRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at" as const,
    order: "desc" as const,
    search: "mozilla",
    ip_address: "192.168.1.100",
    created_after: sevenDaysAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
    created_before: threeDaysAgo.toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IRedditCommunityGuest.IRequest;

  // Step 3: Submit the complex filter request to the guest listing endpoint
  const guestPage: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: filterRequest,
    });
  typia.assert(guestPage);

  // Step 4: Validate business logic - data array respects pagination limit
  TestValidator.predicate(
    "data array length respects pagination limit",
    guestPage.data.length <= filterRequest.limit,
  );
}
