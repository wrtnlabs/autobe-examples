import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the search and filtering capabilities of the member list endpoint.
 * Validates display name search, email filtering, banned status filtering,
 * date range filtering, custom sorting, and pagination functionality.
 */
export async function test_api_member_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create test-specific connection
  const testConnection: api.IConnection = { host: connection.host };
  // 1. Test basic retrieval with default parameters
  const defaultResponse = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  // 2. Test pagination parameters
  const paginationResponse = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "page number matches",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginationResponse.pagination.pages ===
      Math.ceil(
        paginationResponse.pagination.records /
          paginationResponse.pagination.limit,
      ),
  );
  // 3. Test search by display_name (partial text matching)
  const searchName = typia.random<string>();
  const searchResponse = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        search: searchName,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns valid response",
    searchResponse.data !== undefined,
  );
  // 4. Test email filtering with domain-based search
  const emailDomain = "@test.com";
  const emailFilterResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        email: emailDomain,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emailFilterResponse);
  TestValidator.predicate(
    "email filter returns valid response",
    emailFilterResponse.data !== undefined,
  );
  // 5. Test banned status filtering (banned = false - active members)
  const activeMembersResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        banned: false,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(activeMembersResponse);
  // Verify all returned members are not banned
  for (const member of activeMembersResponse.data) {
    TestValidator.equals("member is not banned", member.banned, false);
  }
  // 6. Test banned status filtering (banned = true - banned members)
  const bannedMembersResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        banned: true,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(bannedMembersResponse);
  // Verify all returned members are banned
  for (const member of bannedMembersResponse.data) {
    TestValidator.equals("member is banned", member.banned, true);
  }
  // 7. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const dateRangeResponse = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        createdAtFrom: twoMonthsAgo.toISOString(),
        createdAtTo: oneMonthAgo.toISOString(),
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  // Verify all members are within the date range
  for (const member of dateRangeResponse.data) {
    const memberCreated = new Date(member.created_at);
    TestValidator.predicate(
      "member created after fromDate",
      memberCreated >= twoMonthsAgo,
    );
    TestValidator.predicate(
      "member created before toDate",
      memberCreated <= oneMonthAgo,
    );
  }
  // 8. Test sorting by created_at (descending - newest first)
  const sortCreatedDescResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(sortCreatedDescResponse);
  // Verify descending order
  for (let i = 1; i < sortCreatedDescResponse.data.length; i++) {
    const prevDate = new Date(sortCreatedDescResponse.data[i - 1].created_at);
    const currDate = new Date(sortCreatedDescResponse.data[i].created_at);
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 9. Test sorting by created_at (ascending - oldest first)
  const sortCreatedAscResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(sortCreatedAscResponse);
  // Verify ascending order
  for (let i = 1; i < sortCreatedAscResponse.data.length; i++) {
    const prevDate = new Date(sortCreatedAscResponse.data[i - 1].created_at);
    const currDate = new Date(sortCreatedAscResponse.data[i].created_at);
    TestValidator.predicate(
      `created_at ascending order at index ${i}`,
      prevDate <= currDate,
    );
  }
  // 10. Test sorting by display_name (alphabetical)
  const sortNameResponse = await api.functional.discussionBoard.members.index(
    testConnection,
    {
      body: {
        sortBy: "display_name",
        sortOrder: "asc",
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(sortNameResponse);
  // Filter out null display_names for sorting validation
  const validNameMembers = sortNameResponse.data.filter(
    (m) => m.display_name !== null,
  );
  for (let i = 1; i < validNameMembers.length; i++) {
    const prevName = validNameMembers[i - 1].display_name!;
    const currName = validNameMembers[i].display_name!;
    TestValidator.predicate(
      `display_name ascending order at index ${i}`,
      prevName.localeCompare(currName) <= 0,
    );
  }
  // 11. Test combined filters (search + banned status + pagination)
  const combinedSearchTerm = typia.random<string>();
  const combinedFilterResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        search: combinedSearchTerm,
        banned: false,
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter page number",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedFilterResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filter data count within limit",
    combinedFilterResponse.data.length <= 5,
  );
  // Verify all members in combined filter are active
  for (const member of combinedFilterResponse.data) {
    TestValidator.equals(
      "member in combined filter is active",
      member.banned,
      false,
    );
  }
  // 12. Validate member summary structure (presence of required fields)
  const structureTestResponse =
    await api.functional.discussionBoard.members.index(testConnection, {
      body: {
        limit: 1,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(structureTestResponse);
  if (structureTestResponse.data.length > 0) {
    const sampleMember = structureTestResponse.data[0];
    // Verify required fields exist (business logic, not type validation)
    TestValidator.predicate("member has id", sampleMember.id !== undefined);
    TestValidator.predicate(
      "member has email",
      sampleMember.email !== undefined,
    );
    TestValidator.predicate(
      "member has banned status",
      sampleMember.banned !== undefined,
    );
    TestValidator.predicate(
      "member has created_at",
      sampleMember.created_at !== undefined,
    );
  }
  // 13. Test pagination navigation (page 2)
  if (defaultResponse.pagination.pages >= 2) {
    const page2Response = await api.functional.discussionBoard.members.index(
      testConnection,
      {
        body: {
          page: 2,
          limit: defaultResponse.pagination.limit,
        } satisfies IDiscussionBoardMember.IRequest,
      },
    );
    typia.assert(page2Response);
    TestValidator.equals(
      "page 2 current page number",
      page2Response.pagination.current,
      2,
    );
    TestValidator.predicate("page 2 has data", page2Response.data.length > 0);
  }
}
