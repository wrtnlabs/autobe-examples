import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_browsing_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Test default listing with limit=10 on page 1
  const firstPage = await api.functional.redditCommunity.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(firstPage);
  // Verify pagination metadata for page 1
  TestValidator.equals(
    "current page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "data array should contain up to 10 members",
    firstPage.data.length <= 10,
  );
  // 2. Test page 2 with same limit
  const secondPage = await api.functional.redditCommunity.members.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      },
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "current page should be 2",
    secondPage.pagination.current,
    2,
  );
  // Verify pages calculation is correct
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should be correct",
    firstPage.pagination.pages,
    expectedPages,
  );
  // Verify total records match between pages
  TestValidator.equals(
    "records count should match between page 1 and page 2",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // Verify pages are different (no overlapping member IDs)
  const firstPageIds = new Set(firstPage.data.map((m) => m.id));
  const secondPageIds = new Set(secondPage.data.map((m) => m.id));
  const hasOverlap = [...firstPageIds].some((id) => secondPageIds.has(id));
  TestValidator.predicate(
    "page 1 and page 2 should not have overlapping members",
    !hasOverlap,
  );
  // 3. Validate member summary fields (id, username, created_at, updated_at)
  // Each member should have the expected fields from ISummary
  for (const member of firstPage.data) {
    typia.assert(member);
    TestValidator.predicate(
      "member id should be valid UUID",
      /^[0-9a-f-]{36}$/i.test(member.id),
    );
    TestValidator.predicate(
      "member username should not be empty",
      member.username.length > 0,
    );
    TestValidator.predicate(
      "created_at should be valid ISO date-time",
      !isNaN(Date.parse(member.created_at)),
    );
    TestValidator.predicate(
      "updated_at should be valid ISO date-time",
      !isNaN(Date.parse(member.updated_at)),
    );
  }
  // 4. Test default listing returns all active members
  // Note: Since we cannot filter by status in the API (status field in ISummary doesn't exist),
  // we verify the pagination works correctly for browsing all available members
  const allMembersPage = await api.functional.redditCommunity.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(allMembersPage);
  TestValidator.equals(
    "default listing should return paginated results",
    allMembersPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default listing should have records count",
    allMembersPage.pagination.records > 0,
  );
  // 5. Test status='active' filter if available in request
  const activeMembersPage = await api.functional.redditCommunity.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "active",
      },
    },
  );
  typia.assert(activeMembersPage);
  TestValidator.equals(
    "status='active' filter should return page 1",
    activeMembersPage.pagination.current,
    1,
  );
  // 6. Test deleted members filter
  const deletedMembersPage = await api.functional.redditCommunity.members.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "deleted",
      },
    },
  );
  typia.assert(deletedMembersPage);
  TestValidator.equals(
    "status='deleted' filter should return page 1",
    deletedMembersPage.pagination.current,
    1,
  );
  // 7. Verify pagination structure consistency
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current should be non-negative",
    firstPage.pagination.current >= 0,
  );
}
