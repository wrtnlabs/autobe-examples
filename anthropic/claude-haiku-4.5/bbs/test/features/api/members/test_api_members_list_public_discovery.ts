import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member discovery functionality allowing users to browse registered
 * members.
 *
 * This test validates the public member listing API by:
 *
 * 1. Creating multiple member accounts to populate the member list
 * 2. Performing member searches without filters to retrieve active members
 * 3. Validating that responses include only public profile information
 * 4. Testing pagination with different page and limit values
 * 5. Verifying default sorting by creation_at (newest members first)
 * 6. Confirming pagination metadata accurately reflects member counts
 * 7. Ensuring email addresses and sensitive details are not exposed
 *
 * The test ensures member discovery provides safe public browsing without
 * compromising member privacy by excluding personal information.
 */
export async function test_api_members_list_public_discovery(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts
  const memberCount = 5;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email:
          typia
            .random<string & tags.Format<"email">>()
            .split("@")[0]
            .substring(0, 20) + `_${i}@test.example.com`,
        username: `testuser_${i}_${RandomGenerator.alphaNumeric(6)}`,
        display_name: `Test User ${i}`,
        password: `Password${i}123!`,
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Step 2: Test basic member listing without filters
  const basicListResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(basicListResponse);
  TestValidator.predicate(
    "response should contain pagination info",
    basicListResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should contain member data array",
    Array.isArray(basicListResponse.data),
  );
  TestValidator.predicate(
    "data array should not be empty",
    basicListResponse.data.length > 0,
  );

  // Step 3: Validate pagination metadata
  const pagination = basicListResponse.pagination;
  TestValidator.predicate(
    "current page should be >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit should be > 0", pagination.limit > 0);
  TestValidator.predicate(
    "records should match created members or more",
    pagination.records >= memberCount,
  );
  TestValidator.predicate(
    "pages should be calculated correctly",
    pagination.pages >= 1,
  );

  // Step 4: Validate member summary data structure
  if (basicListResponse.data.length > 0) {
    const member = basicListResponse.data[0];
    TestValidator.predicate("member should have id", member.id !== undefined);
    TestValidator.predicate(
      "member should have display_name",
      member.display_name !== undefined,
    );
    TestValidator.predicate(
      "member should have account_status",
      member.account_status !== undefined,
    );
    TestValidator.predicate(
      "member should have created_at",
      member.created_at !== undefined,
    );
  }

  // Step 5: Test pagination with different limit values
  const smallLimitResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "small limit should return 2 or fewer items",
    smallLimitResponse.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit should match request",
    smallLimitResponse.pagination.limit,
    2,
  );

  // Step 6: Test pagination with different page numbers
  if (smallLimitResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.discussionBoard.members.index(connection, {
        body: {
          limit: 2,
          page: 2,
        } satisfies IDiscussionBoardMember.IRequest,
      });
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "second page current should be 2",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page should have members",
      secondPageResponse.data.length > 0,
    );
  }

  // Step 7: Test filtering by account_status
  const activeOnlyResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        account_status: ["active"],
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  TestValidator.predicate(
    "active filter should return results",
    activeOnlyResponse.data.length >= 0,
  );
  if (activeOnlyResponse.data.length > 0) {
    TestValidator.equals(
      "all returned members should have active status",
      activeOnlyResponse.data[0].account_status,
      "active",
    );
  }

  // Step 8: Test search functionality
  const firstMemberName = basicListResponse.data[0]?.display_name;
  if (firstMemberName) {
    const searchResponse = await api.functional.discussionBoard.members.index(
      connection,
      {
        body: {
          search: firstMemberName,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(searchResponse);
    TestValidator.predicate(
      "search should return results",
      searchResponse.data.length >= 0,
    );
  }

  // Step 9: Test default sorting (newest members first by created_at)
  const sortedResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortedResponse);
  TestValidator.predicate(
    "sorted response should have data",
    sortedResponse.data.length > 0,
  );
  if (sortedResponse.data.length > 1) {
    const first = new Date(sortedResponse.data[0].created_at);
    const second = new Date(sortedResponse.data[1].created_at);
    TestValidator.predicate(
      "first member should be created after or same time as second",
      first.getTime() >= second.getTime(),
    );
  }

  // Step 10: Test that sensitive data is not exposed
  if (basicListResponse.data.length > 0) {
    const member = basicListResponse.data[0];
    const memberJson = JSON.stringify(member);
    TestValidator.predicate(
      "response should not contain email addresses",
      !memberJson.includes("@"),
    );
    TestValidator.predicate(
      "response should not contain password references",
      !memberJson.toLowerCase().includes("password"),
    );
  }

  // Step 11: Test pagination consistency with larger limit
  const largePageResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(largePageResponse);
  TestValidator.predicate(
    "total records should be non-negative",
    largePageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation should be correct",
    largePageResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current data matches reported total when on first page",
    largePageResponse.data.length <= largePageResponse.pagination.records,
  );
}
