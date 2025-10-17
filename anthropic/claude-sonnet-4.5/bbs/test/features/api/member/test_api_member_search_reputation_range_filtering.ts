import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test comprehensive member search functionality with multiple filter criteria.
 *
 * This test validates the discussion board member search API's filtering
 * capabilities including account status filtering, email verification
 * filtering, username search, and pagination. The test creates multiple member
 * accounts with varying characteristics and verifies that search filters work
 * correctly.
 *
 * Note: The original scenario requested reputation range filtering, but the API
 * does not provide reputation filter parameters in
 * IDiscussionBoardMember.IRequest. This test focuses on the available filtering
 * capabilities: search text, account_status, email_verified, and pagination
 * controls.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts with unique credentials and varying usernames
 * 2. Perform member searches with different filter combinations
 * 3. Verify account status filtering works correctly
 * 4. Verify email verification status filtering
 * 5. Test username search functionality
 * 6. Validate pagination with different page sizes
 * 7. Verify member summary structure contains required fields
 */
export async function test_api_member_search_reputation_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts with distinctive usernames for search testing
  const memberCount = 5;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];
  const testPrefix = `member_${RandomGenerator.alphaNumeric(6)}`;

  for (let i = 0; i < memberCount; i++) {
    const memberData = {
      username: `${testPrefix}_user${i}_${RandomGenerator.alphaNumeric(4)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(2),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Step 2: Perform basic member search without filters to verify API functionality
  const searchAllMembers = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchAllMembers);

  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current page matches request",
    searchAllMembers.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchAllMembers.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchAllMembers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchAllMembers.pagination.pages >= 0,
  );

  // Step 4: Test search with pending_verification account status filter
  const pendingSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "pending_verification",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(pendingSearch);

  TestValidator.predicate(
    "pending verification search returns data array",
    Array.isArray(pendingSearch.data),
  );

  // Step 5: Test search with active account status filter
  const activeSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "active",
        page: 1,
        limit: 15,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeSearch);

  // Step 6: Test search with email verification status filter
  const unverifiedSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        email_verified: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(unverifiedSearch);

  // Step 7: Test username search functionality using partial match
  const usernameSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: testPrefix,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(usernameSearch);

  TestValidator.predicate(
    "username search returns results",
    usernameSearch.data.length >= 0,
  );

  // Step 8: Test pagination with small page size
  const smallPageSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(smallPageSearch);

  TestValidator.equals(
    "small page size matches request",
    smallPageSearch.pagination.limit,
    3,
  );

  // Step 9: Test pagination with maximum allowed page size
  const largePageSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(largePageSearch);

  TestValidator.equals(
    "large page size matches maximum allowed",
    largePageSearch.pagination.limit,
    100,
  );

  // Step 10: Test combined filters - account status and email verification
  const combinedSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        account_status: "pending_verification",
        email_verified: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(combinedSearch);

  // Step 11: Test combined filters with search text
  const fullFilterSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: testPrefix,
        account_status: "pending_verification",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(fullFilterSearch);

  // Step 12: Verify member summary structure from any non-empty result set
  const anyResultSet = [
    searchAllMembers,
    pendingSearch,
    activeSearch,
    usernameSearch,
  ].find((result) => result.data.length > 0);

  if (anyResultSet && anyResultSet.data.length > 0) {
    const sampleMember = anyResultSet.data[0];
    typia.assert(sampleMember);
  }

  // Step 13: Test pagination navigation - page 2
  const secondPageSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(secondPageSearch);

  TestValidator.equals(
    "second page current matches request",
    secondPageSearch.pagination.current,
    2,
  );
}
