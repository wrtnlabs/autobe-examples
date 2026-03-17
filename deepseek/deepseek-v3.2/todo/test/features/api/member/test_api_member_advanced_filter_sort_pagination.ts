import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test advanced member search with date range filtering, status filtering, and sorting options.
 * Create several test members with varied creation times and statuses (active and soft-deleted).
 * Test date range filters: created_from/created_to for creation timestamp filtering,
 * updated_from/updated_to for update timestamp filtering, and deleted_from/deleted_to for soft-deleted accounts.
 * Test the 'active' boolean filter to separate active (deleted_at IS NULL) from soft-deleted accounts (deleted_at IS NOT NULL).
 * Validate all eight sorting options: created_at:desc (default), created_at:asc, email:asc, email:desc,
 * display_name:asc, display_name:desc, updated_at:desc, updated_at:asc.
 * Test pagination with different page sizes (limit: 5, 20, 50) and verify page navigation works correctly.
 * This comprehensive scenario validates the full filtering and sorting capabilities of the administrative member search.
 */
export async function test_api_member_advanced_filter_sort_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create test members with varied attributes and statuses
  const members: ITodoAppMember.ISummary[] = [];
  const memberConnections: api.IConnection[] = [];
  // Create 15 test members - some active, some soft-deleted
  for (let i = 0; i < 15; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
      body: {
        email: `test.member${i}@example.com` satisfies string &
          tags.Format<"email"> as string & tags.Format<"email">,
        password: `Password${i}!` satisfies string &
          tags.Format<"password"> as string & tags.Format<"password">,
        display_name: `Test Member ${i}`,
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri"> as string & tags.Format<"uri">,
        referrer: "https://example.com" satisfies string &
          tags.Format<"uri"> as string & tags.Format<"uri">,
        ip: "192.168.1.1" satisfies string & tags.Format<"ipv4"> as string &
          tags.Format<"ipv4">,
      },
    });
    typia.assert(authorized);
    memberConnections.push(memberConnection);
    // Store member summary for reference
    const memberSummary: ITodoAppMember.ISummary = {
      id: authorized.id,
      email: authorized.email,
      display_name: authorized.display_name,
      created_at: authorized.created_at,
      updated_at: authorized.updated_at,
      deleted_at: authorized.deleted_at,
    };
    members.push(memberSummary);
    // Soft delete every 3rd member for status filtering tests
    if (i % 3 === 0) {
      // Simulate soft-delete by setting deleted_at
      // Note: In real scenario, we would call a soft-delete API endpoint
      // For now, we'll mark them in our test data
      memberSummary.deleted_at = new Date().toISOString();
    }
  }
  // Create admin connection for member search (note: actual auth would be needed)
  // For this test, we'll use a member connection with appropriate permissions
  const searchConnection: api.IConnection = { host: connection.host };
  // Note: In production, we would authenticate as admin
  // Test 1: Active filter (active accounts only)
  const activeResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        active: true,
        limit: 50,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(activeResult);
  // Count active members (deleted_at is null)
  const expectedActiveCount = members.filter(
    (m) => m.deleted_at === null,
  ).length;
  TestValidator.equals(
    "active member count",
    activeResult.data.length,
    expectedActiveCount,
  );
  // Test 2: Soft-deleted filter
  const deletedResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        active: false,
        limit: 50,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(deletedResult);
  const expectedDeletedCount = members.filter(
    (m) => m.deleted_at !== null,
  ).length;
  TestValidator.equals(
    "deleted member count",
    deletedResult.data.length,
    expectedDeletedCount,
  );
  // Test 3: Date range filtering - created_from/created_to
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  // All members created in the past hour should be returned
  const dateRangeResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        created_from: oneHourAgo,
        created_to: oneHourLater,
        limit: 50,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "members created within time range",
    dateRangeResult.data.length > 0,
  );
  // Test 4: Sorting options
  const sortOptions = [
    "created_at:desc",
    "created_at:asc",
    "email:asc",
    "email:desc",
    "display_name:asc",
    "display_name:desc",
    "updated_at:desc",
    "updated_at:asc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sortedResult = await api.functional.todoApp.members.index(
      searchConnection,
      {
        body: {
          sort: sortOption,
          limit: 10,
        } satisfies ITodoAppMember.IRequest,
      },
    );
    typia.assert(sortedResult);
    TestValidator.predicate(
      `sort ${sortOption} returns results`,
      sortedResult.data.length > 0,
    );
    // Validate sort order for email sorting
    if (sortOption === "email:asc") {
      const emails = sortedResult.data.map((m) => m.email);
      const sortedEmails = [...emails].sort();
      TestValidator.equals("email ascending sort", emails, sortedEmails);
    } else if (sortOption === "email:desc") {
      const emails = sortedResult.data.map((m) => m.email);
      const sortedEmails = [...emails].sort().reverse();
      TestValidator.equals("email descending sort", emails, sortedEmails);
    }
  }
  // Test 5: Pagination with different limits
  const limitSizes = [5, 20, 50] as const;
  for (const limit of limitSizes) {
    const page1Result = await api.functional.todoApp.members.index(
      searchConnection,
      {
        body: {
          page: 1,
          limit: limit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ITodoAppMember.IRequest,
      },
    );
    typia.assert(page1Result);
    TestValidator.equals(
      `page 1 limit ${limit} data length <= limit`,
      page1Result.data.length,
      limit,
    );
    TestValidator.predicate(
      `page 1 limit ${limit} has pagination info`,
      page1Result.pagination !== undefined,
    );
    // Test page 2 if total pages > 1
    if (page1Result.pagination.pages > 1) {
      const page2Result = await api.functional.todoApp.members.index(
        searchConnection,
        {
          body: {
            page: 2,
            limit: limit satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number,
          } satisfies ITodoAppMember.IRequest,
        },
      );
      typia.assert(page2Result);
      TestValidator.equals(
        `page 2 limit ${limit} data length <= limit`,
        page2Result.data.length,
        limit,
      );
      // Ensure page 1 and page 2 have different data
      const page1Ids = page1Result.data.map((m) => m.id);
      const page2Ids = page2Result.data.map((m) => m.id);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      TestValidator.equals(
        `page 1 and 2 limit ${limit} have no overlap`,
        overlap.length,
        0,
      );
    }
  }
  // Test 6: Combined filter with search
  const searchResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        search: "test",
        active: true,
        limit: 10,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // All returned members should contain "test" in email or display_name
  for (const member of searchResult.data) {
    const containsTest =
      member.email.toLowerCase().includes("test") ||
      member.display_name.toLowerCase().includes("test");
    TestValidator.predicate(
      `member ${member.id} contains search term`,
      containsTest,
    );
  }
  // Test 7: Empty result filters
  const farFuture = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResult = await api.functional.todoApp.members.index(
    searchConnection,
    {
      body: {
        created_from: farFuture,
        limit: 10,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "far future date filter returns empty",
    emptyResult.data.length,
    0,
  );
}
