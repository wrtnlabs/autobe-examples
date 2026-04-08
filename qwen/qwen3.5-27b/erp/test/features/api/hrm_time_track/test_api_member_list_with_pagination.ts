import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member account listing with pagination support.
 *
 * Validates the complete member listing workflow including pagination parameters, response structure validation, and pagination metadata accuracy. Ensures that the API correctly returns paginated member summaries with proper pagination information.
 *
 * Special attention is given to verifying pagination consistency, member summary field formats, and that the API respects pagination limits while providing accurate total record counts and page calculations.
 *
 * 1. Create a connection for member listing operations.
 * 2. Request first page with limit of 10 members.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify member summary fields are properly formatted.
 * 5. Request second page to verify pagination navigation.
 * 6. Test with different limit values to ensure limit enforcement.
 */
export async function test_api_member_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for member listing
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Request first page with limit of 10
  const page1 = await api.functional.hrmTimeTrack.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(page1);
  // 2. Validate first page response structure
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate("data array exists", Array.isArray(page1.data));
  TestValidator.predicate(
    "data count does not exceed limit",
    page1.data.length <= 10,
  );
  // 3. Validate pagination metadata consistency
  TestValidator.predicate(
    "records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", page1.pagination.pages >= 0);
  // Calculate expected pages and validate
  const expectedPages =
    page1.pagination.limit > 0
      ? Math.ceil(page1.pagination.records / page1.pagination.limit)
      : 0;
  TestValidator.equals(
    "pages calculated correctly",
    page1.pagination.pages,
    expectedPages,
  );
  // 4. Validate member summary fields for each member
  for (const member of page1.data) {
    // Validate UUID format for id
    TestValidator.predicate(
      `member id is valid UUID: ${member.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        member.id,
      ),
    );
    // Validate email format
    TestValidator.predicate(
      `member email is valid: ${member.email}`,
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email),
    );
    // Validate created_at is ISO 8601 date-time
    TestValidator.predicate(
      `member created_at is valid date-time: ${member.created_at}`,
      !isNaN(Date.parse(member.created_at)),
    );
    // Validate updated_at is ISO 8601 date-time
    TestValidator.predicate(
      `member updated_at is valid date-time: ${member.updated_at}`,
      !isNaN(Date.parse(member.updated_at)),
    );
  }
  // 5. Request second page if there are enough records
  if (page1.pagination.pages >= 2) {
    const page2 = await api.functional.hrmTimeTrack.members.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IHrmTimeTrackMember.IRequest,
      },
    );
    typia.assert(page2);
    // Validate second page metadata
    TestValidator.equals(
      "second page current is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals("second page limit is 10", page2.pagination.limit, 10);
    TestValidator.equals(
      "second page records matches first",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "second page pages matches first",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    // Verify data count does not exceed limit
    TestValidator.predicate(
      "second page data count does not exceed limit",
      page2.data.length <= 10,
    );
    // Validate member summary fields for second page
    for (const member of page2.data) {
      TestValidator.predicate(
        `page2 member id is valid UUID: ${member.id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          member.id,
        ),
      );
      TestValidator.predicate(
        `page2 member email is valid: ${member.email}`,
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email),
      );
    }
  }
  // 6. Test with different limit value (5)
  const pageWithLimit5 = await api.functional.hrmTimeTrack.members.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IHrmTimeTrackMember.IRequest,
    },
  );
  typia.assert(pageWithLimit5);
  TestValidator.equals(
    "limit 5 is respected",
    pageWithLimit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data count with limit 5 does not exceed 5",
    pageWithLimit5.data.length <= 5,
  );
  // Validate pages calculation with limit 5
  const expectedPagesLimit5 =
    pageWithLimit5.pagination.limit > 0
      ? Math.ceil(
          pageWithLimit5.pagination.records / pageWithLimit5.pagination.limit,
        )
      : 0;
  TestValidator.equals(
    "pages calculated correctly with limit 5",
    pageWithLimit5.pagination.pages,
    expectedPagesLimit5,
  );
}
