import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieval of ban history for members who have no ban records or when
 * filters result in no matches.
 *
 * This scenario validates that the endpoint handles empty result sets
 * gracefully with proper pagination metadata. The test creates a moderator
 * account and queries ban history for a non-existent username to guarantee zero
 * results.
 *
 * The test verifies:
 *
 * 1. Response structure is valid even with empty data
 * 2. Pagination metadata correctly shows zero records and zero pages
 * 3. No errors occur when requesting pages beyond available data
 * 4. API returns proper JSON structure for empty result sets
 *
 * This ensures robust handling of edge cases where no ban records exist.
 */
export async function test_api_member_ban_history_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Query ban history for a non-existent username (guaranteed to have no bans)
  const nonExistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(16)}`;

  const emptyResultPage1 = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const response1: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: nonExistentUsername,
        body: emptyResultPage1,
      },
    );
  typia.assert(response1);

  // Step 3: Validate response structure with empty data array
  TestValidator.equals(
    "empty data array length should be 0",
    response1.data.length,
    0,
  );

  // Step 4: Verify pagination metadata shows zero records and zero pages
  TestValidator.equals(
    "pagination records should be 0 for non-existent user",
    response1.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0 when no records exist",
    response1.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page should match request",
    response1.pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit should match request",
    response1.pagination.limit,
    10,
  );

  // Step 5: Test requesting pages beyond available data (page 2 when there are 0 pages)
  const emptyResultPage2 = {
    page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const response2: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: nonExistentUsername,
        body: emptyResultPage2,
      },
    );
  typia.assert(response2);

  // Step 6: Verify no errors when requesting beyond available pages
  TestValidator.equals(
    "data should still be empty array on page 2",
    response2.data.length,
    0,
  );

  TestValidator.equals(
    "records count should remain 0 on any page",
    response2.pagination.records,
    0,
  );

  TestValidator.equals(
    "pages count should remain 0 on any page",
    response2.pagination.pages,
    0,
  );

  // Step 7: Test with search filters that match no records
  const filteredEmptyResult = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    status: "active" as const,
    is_permanent: true,
  } satisfies IRedditCommunityCommunityBan.IRequest;

  const response3: IPageIRedditCommunityCommunityBan.ISummary =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: nonExistentUsername,
        body: filteredEmptyResult,
      },
    );
  typia.assert(response3);

  TestValidator.equals(
    "filtered search should also return empty array",
    response3.data.length,
    0,
  );

  TestValidator.equals(
    "filtered search pagination records should be 0",
    response3.pagination.records,
    0,
  );

  TestValidator.equals(
    "filtered search pagination pages should be 0",
    response3.pagination.pages,
    0,
  );
}
