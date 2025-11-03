import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member directory search and filtering as an unauthenticated guest user.
 *
 * This test validates that guest users can search the member directory using
 * various filters, sorting options, and pagination controls. It verifies the
 * search functionality works correctly for keyword matching, status filtering,
 * date range filtering, and different sort orders. The test also ensures that
 * response data excludes sensitive member information such as email addresses
 * and passwords.
 *
 * Note: This test focuses on search functionality rather than privacy filtering
 * because the member creation API does not provide a way to set
 * profile_visibility during registration. Privacy filtering tests would require
 * additional APIs not available in the current system.
 *
 * Process:
 *
 * 1. Create test members with varied usernames, display names, and profile data
 * 2. Search member directory as unauthenticated guest with various filters
 * 3. Verify search, filter, sort, and pagination functionality
 * 4. Ensure no sensitive data (email, password) appears in responses
 * 5. Validate response structure matches expected pagination format
 */
export async function test_api_member_search_public_profiles_as_guest(
  connection: api.IConnection,
) {
  // Create unauthenticated connection for guest access
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Authenticated connection for creating test members
  const setupConnection: api.IConnection = connection;

  // Create test members with distinctive usernames and display names
  const testMembers: IDiscussionBoardMember.ISummary[] = [];

  // Create 5 test members with varied attributes
  const createdMembers = await ArrayUtil.asyncRepeat(5, async (index) => {
    const uniqueId = RandomGenerator.alphaNumeric(8);
    const member = await api.functional.discussionBoard.members.create(
      setupConnection,
      {
        body: {
          username: `testuser_${uniqueId}`,
          email: typia.random<string & tags.Format<"email">>(),
          password: "SecurePass123!",
          display_name: `Test User ${index + 1}`,
          bio: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          location: RandomGenerator.name(2),
          website_url: typia.random<string & tags.Format<"uri">>(),
          profile_picture_url: typia.random<string & tags.Format<"uri">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      },
    );
    typia.assert(member);
    return member;
  });

  testMembers.push(...createdMembers);

  // Scenario 1: Basic search as guest - retrieve member directory
  const basicSearch = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(basicSearch);

  // Validate response structure
  TestValidator.predicate(
    "basic search returns valid page structure",
    basicSearch.pagination !== undefined && basicSearch.data !== undefined,
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    basicSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    basicSearch.pagination.pages >= 0,
  );

  // Scenario 2: Search by keyword matching created member username
  const searchKeyword = testMembers[0].username.substring(0, 8);
  const keywordSearch = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        search: searchKeyword,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(keywordSearch);

  // Validate search finds matching member
  TestValidator.predicate(
    "keyword search returns results",
    keywordSearch.data.length > 0,
  );

  // Scenario 3: Filter by active status
  const statusFilter = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        status: "active",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(statusFilter);

  // Validate status filter returns results
  TestValidator.predicate(
    "status filter returns valid response",
    statusFilter.data !== undefined,
  );

  // Scenario 4: Date range filtering - members created in last hour
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const now = new Date().toISOString();
  const dateRangeFilter = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        created_after: oneHourAgo,
        created_before: now,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(dateRangeFilter);

  // Should include our newly created test members
  TestValidator.predicate(
    "date range filter returns recent members",
    dateRangeFilter.data.length >= 5,
  );

  // Scenario 5: Sort by username ascending
  const sortedAsc = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        sort_by: "username",
        sort_order: "asc",
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedAsc);

  // Validate sorting - check first few entries are in order
  if (sortedAsc.data.length >= 2) {
    TestValidator.predicate(
      "username sort ascending works correctly",
      sortedAsc.data[0].username <= sortedAsc.data[1].username,
    );
  }

  // Scenario 6: Sort by username descending
  const sortedDesc = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        sort_by: "username",
        sort_order: "desc",
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedDesc);

  // Validate descending order
  if (sortedDesc.data.length >= 2) {
    TestValidator.predicate(
      "username sort descending works correctly",
      sortedDesc.data[0].username >= sortedDesc.data[1].username,
    );
  }

  // Scenario 7: Pagination with custom page size
  const paginatedSearch = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  // Validate pagination settings are respected
  TestValidator.equals(
    "pagination current page matches request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length respects limit",
    paginatedSearch.data.length <= 10,
  );

  // Scenario 8: Search by display name
  const displayNameSearch = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        search: "Test User",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(displayNameSearch);

  // Should find our test members with "Test User" in display name
  TestValidator.predicate(
    "display name search returns matching results",
    displayNameSearch.data.some((m) => m.display_name?.includes("Test User")),
  );

  // Scenario 9: Sort by creation date descending (newest first)
  const sortedByDate = await api.functional.discussionBoard.members.index(
    guestConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedByDate);

  TestValidator.predicate(
    "created_at sort returns valid response",
    sortedByDate.data.length >= 0,
  );

  // Final validation: Verify no sensitive fields in any response
  const allResponses = [
    basicSearch,
    keywordSearch,
    statusFilter,
    dateRangeFilter,
    sortedAsc,
    sortedDesc,
    paginatedSearch,
    displayNameSearch,
    sortedByDate,
  ];

  for (const response of allResponses) {
    for (const member of response.data) {
      // Ensure ISummary structure - should only have: id, username, display_name, profile_picture_url
      TestValidator.predicate(
        "member summary has required id field",
        typeof member.id === "string",
      );
      TestValidator.predicate(
        "member summary has required username field",
        typeof member.username === "string",
      );

      // Ensure no sensitive fields are present
      const memberObj = member as any;
      TestValidator.predicate(
        "member summary excludes email field",
        memberObj.email === undefined,
      );
      TestValidator.predicate(
        "member summary excludes password_hash field",
        memberObj.password_hash === undefined,
      );
      TestValidator.predicate(
        "member summary excludes password field",
        memberObj.password === undefined,
      );
    }
  }
}
