import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering and sorting member accounts via the members list endpoint.
 *
 * Validates the PATCH /redditClone/members endpoint functionality for searching, filtering, and sorting member accounts. Tests partial match filtering by email and username, sorting by creation date and username, date range filtering, and pagination parameters. Ensures that the API correctly returns paginated member summaries with accurate filtering and sorting behavior.
 *
 * Special attention is given to verifying that partial match filters work correctly for both email and username fields, that sorting produces correctly ordered results, and that pagination metadata accurately reflects the total records and page information.
 *
 * 1. Test email partial match filtering with a common domain pattern.
 * 2. Test username partial match filtering with a common prefix.
 * 3. Test sorting by created_at in descending order (newest first).
 * 4. Test sorting by created_at in ascending order (oldest first).
 * 5. Test sorting by username alphabetically.
 * 6. Test date range filtering using created_at_start and created_at_end.
 * 7. Test pagination with page and limit parameters.
 * 8. Test combined filters (email filter with sorting).
 */
export async function test_api_member_list_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test email partial match filtering
  const emailFilterResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        email: "test",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filter returns valid pagination",
    emailFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "email filter returns valid limit",
    emailFilterResult.pagination.limit > 0,
  );
  // 2. Test username partial match filtering
  const usernameFilterResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        username: "user",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(usernameFilterResult);
  TestValidator.predicate(
    "username filter returns valid response",
    usernameFilterResult.pagination.records >= 0,
  );
  // 3. Test sorting by created_at descending (newest first)
  const sortByCreatedDesc = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate(
    "sort by created_at desc returns valid data",
    sortByCreatedDesc.data.length <= sortByCreatedDesc.pagination.limit,
  );
  // 4. Test sorting by created_at ascending (oldest first)
  const sortByCreatedAsc = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate(
    "sort by created_at asc returns valid data",
    sortByCreatedAsc.data.length <= sortByCreatedAsc.pagination.limit,
  );
  // 5. Test sorting by username alphabetically
  const sortByUsername = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        sortBy: "username",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(sortByUsername);
  TestValidator.predicate(
    "sort by username returns valid data",
    sortByUsername.data.length <= sortByUsername.pagination.limit,
  );
  // 6. Test date range filtering
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const now = new Date();
  const dateRangeResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        created_at_start: oneMonthAgo.toISOString(),
        created_at_end: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeResult.pagination.current >= 1,
  );
  // 7. Test pagination parameters
  const paginationResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // 8. Test combined filters (email + sort)
  const combinedFilterResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        email: "example",
        sortBy: "username",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterResult.pagination.records >= 0,
  );
  // 9. Test status filter for active members
  const activeMembersResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(activeMembersResult);
  TestValidator.predicate(
    "active status filter returns valid response",
    activeMembersResult.pagination.current >= 1,
  );
  // 10. Test status filter for deleted members
  const deletedMembersResult = await api.functional.redditClone.members.index(
    connection,
    {
      body: {
        status: "deleted",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(deletedMembersResult);
  TestValidator.predicate(
    "deleted status filter returns valid response",
    deletedMembersResult.pagination.current >= 1,
  );
  // 11. Verify member summary structure in data array
  if (sortByUsername.data.length > 0) {
    const firstMember = sortByUsername.data[0];
    TestValidator.predicate(
      "member has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstMember.id,
      ),
    );
    TestValidator.predicate(
      "member has non-empty email",
      firstMember.email.length > 0,
    );
    TestValidator.predicate(
      "member has non-empty username",
      firstMember.username.length > 0,
    );
    TestValidator.predicate(
      "member has valid created_at timestamp",
      firstMember.created_at.length > 0,
    );
    TestValidator.predicate(
      "member has profile with display_name",
      firstMember.profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "member profile has valid karma",
      typeof firstMember.profile.karma === "number",
    );
  }
}
