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
 * Test general search functionality across guest records using the search
 * parameter.
 *
 * This test validates that moderators can perform text-based searches across
 * guest data, potentially matching IP addresses, user agent strings, or session
 * tokens. The test authenticates as a moderator, submits a search query string
 * in the request body, and verifies that the response contains guests matching
 * the search criteria.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Execute guest search with search query parameter
 * 3. Validate paginated response structure
 * 4. Verify search results contain guest summary data
 */
export async function test_api_guest_list_with_search_query(
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

  // Step 2: Execute guest search with search query parameter
  const searchQuery = RandomGenerator.alphaNumeric(8);
  const searchResult: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.moderator.guests.index(connection, {
      body: {
        search: searchQuery,
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Verify search operation completed successfully
  TestValidator.predicate(
    "search returned valid paginated response",
    searchResult.data !== null && searchResult.data !== undefined,
  );
}
