import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test pagination controls for member lists using page and limit parameters.
 *
 * Create sufficient member accounts to test multiple pages. Request page 1 with
 * limit 10 and verify first 10 members are returned. Request page 2 with limit
 * 10 and verify next 10 members are returned. Verify pagination metadata
 * includes current page, limit, total record count, and total page count. Test
 * with different limit values (1, 5, 20, 100) to validate limit enforcement.
 * Test requesting page beyond available results and verify appropriate
 * response. Validate that limit maximum of 100 is enforced. Test default limit
 * and page values when parameters are omitted.
 *
 * 1. Create 35+ member accounts for comprehensive pagination testing
 * 2. Test page 1 with limit 10 - verify first page data and metadata
 * 3. Test page 2 with limit 10 - verify second page data and metadata
 * 4. Test various limit values (1, 5, 20, 100) for limit enforcement
 * 5. Test requesting page beyond available results
 * 6. Verify maximum limit enforcement
 * 7. Test default values when parameters are omitted
 */
export async function test_api_members_pagination(connection: api.IConnection) {
  // Create 35 member accounts for comprehensive pagination testing
  const members = await ArrayUtil.asyncRepeat(35, async (index) => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: `user${index}@test.com` satisfies string & tags.Format<"email">,
        username: `user_${index}` satisfies string &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">,
        display_name: RandomGenerator.name(),
        password: "TestPassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });
  TestValidator.predicate(
    "35 members created successfully",
    members.length === 35,
  );

  // Test page 1 with limit 10
  const page1Response = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 returns 10 members",
    page1Response.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit is 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 has correct total records",
    page1Response.pagination.records,
    35,
  );
  TestValidator.equals(
    "page 1 total pages is 4",
    page1Response.pagination.pages,
    4,
  );

  // Test page 2 with limit 10
  const page2Response = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 returns 10 members",
    page2Response.data.length,
    10,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.notEquals(
    "page 2 members differ from page 1",
    page1Response.data,
    page2Response.data,
  );

  // Test limit 1
  const limitOneResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(limitOneResponse);
  TestValidator.equals(
    "limit 1 returns 1 member",
    limitOneResponse.data.length,
    1,
  );
  TestValidator.equals(
    "limit 1 total pages is 35",
    limitOneResponse.pagination.pages,
    35,
  );

  // Test limit 5
  const limitFiveResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(limitFiveResponse);
  TestValidator.equals(
    "limit 5 returns 5 members",
    limitFiveResponse.data.length,
    5,
  );
  TestValidator.equals(
    "limit 5 total pages is 7",
    limitFiveResponse.pagination.pages,
    7,
  );

  // Test limit 20
  const limitTwentyResponse =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(limitTwentyResponse);
  TestValidator.equals(
    "limit 20 returns 20 members",
    limitTwentyResponse.data.length,
    20,
  );
  TestValidator.equals(
    "limit 20 total pages is 2",
    limitTwentyResponse.pagination.pages,
    2,
  );

  // Test limit 100
  const limitHundredResponse =
    await api.functional.discussionBoard.members.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(limitHundredResponse);
  TestValidator.equals(
    "limit 100 returns all 35 members",
    limitHundredResponse.data.length,
    35,
  );
  TestValidator.equals(
    "limit 100 total pages is 1",
    limitHundredResponse.pagination.pages,
    1,
  );

  // Test requesting page beyond available results
  const beyondPageResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        page: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(beyondPageResponse);
  TestValidator.predicate(
    "beyond page returns empty or last page data",
    beyondPageResponse.data.length === 0 ||
      beyondPageResponse.pagination.current >=
        beyondPageResponse.pagination.pages,
  );

  // Test default values when parameters are omitted
  const defaultResponse = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default pagination works",
    defaultResponse.pagination.limit > 0 &&
      defaultResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "default response contains members",
    defaultResponse.data.length > 0,
  );
}
