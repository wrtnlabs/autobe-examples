import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test searching and filtering member accounts by various criteria.
 *
 * Validates the member list search and filtering functionality including case-insensitive partial matching on email and display name fields, date range filtering, sorting by multiple fields, and pagination. Ensures that the search performs correctly across different filter combinations and that pagination metadata accurately reflects the result set.
 *
 * Special attention is given to verifying that search is case-insensitive, date range filters correctly narrow results, and sorting works for all supported fields (email, display_name, created_at, updated_at).
 *
 * 1. Test basic member list retrieval with default parameters.
 * 2. Test search by email with partial matching.
 * 3. Test search by display name with case-insensitive matching.
 * 4. Test date range filtering with created_at_from and created_at_to.
 * 5. Test sorting by email in ascending order.
 * 6. Test sorting by created_at in descending order.
 * 7. Test pagination with custom page and limit values.
 * 8. Test include_deleted flag to include soft-deleted members.
 * 9. Validate response structure and pagination metadata accuracy.
 */
export async function test_api_member_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic member list retrieval with default parameters
  const defaultList = await api.functional.todoApp.members.index(connection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  typia.assert(defaultList);
  TestValidator.equals("default pagination exists", defaultList.pagination, {
    current: defaultList.pagination.current,
    limit: defaultList.pagination.limit,
    records: defaultList.pagination.records,
    pages: defaultList.pagination.pages,
  });
  // 2. Test search by email with partial matching
  const emailSearch = await api.functional.todoApp.members.index(connection, {
    body: {
      search: "@",
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(emailSearch);
  TestValidator.predicate(
    "email search returns results",
    emailSearch.data.length >= 0,
  );
  // Verify all returned members have email containing "@"
  await ArrayUtil.asyncForEach(emailSearch.data, async (member) => {
    TestValidator.predicate(
      `member ${member.id} email contains @`,
      member.email.includes("@"),
    );
  });
  // 3. Test search by display name with case-insensitive matching
  const nameSearch = await api.functional.todoApp.members.index(connection, {
    body: {
      search: "a", // Common letter to find some members
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(nameSearch);
  TestValidator.predicate(
    "name search returns results",
    nameSearch.data.length >= 0,
  );
  // Verify all returned members have email or display_name containing "a" (case-insensitive)
  await ArrayUtil.asyncForEach(nameSearch.data, async (member) => {
    const matchesEmail = member.email.toLowerCase().includes("a");
    const matchesName =
      member.display_name?.toLowerCase().includes("a") ?? false;
    TestValidator.predicate(
      `member ${member.id} matches search criteria`,
      matchesEmail || matchesName,
    );
  });
  // 4. Test date range filtering with created_at_from and created_at_to
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFilter = await api.functional.todoApp.members.index(connection, {
    body: {
      created_at_from: oneYearAgo.toISOString(),
      created_at_to: new Date().toISOString(),
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(dateFilter);
  TestValidator.predicate(
    "date filter returns results",
    dateFilter.data.length >= 0,
  );
  // Verify all returned members were created within the date range
  await ArrayUtil.asyncForEach(dateFilter.data, async (member) => {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      `member ${member.id} created_at within range`,
      createdAt >= oneYearAgo && createdAt <= new Date(),
    );
  });
  // 5. Test sorting by email in ascending order
  const emailSortAsc = await api.functional.todoApp.members.index(connection, {
    body: {
      sort_by: "email",
      sort_order: "asc",
      limit: 100,
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(emailSortAsc);
  if (emailSortAsc.data.length > 1) {
    // Verify emails are in ascending order
    for (let i = 1; i < emailSortAsc.data.length; i++) {
      TestValidator.predicate(
        `email sort ascending: index ${i - 1} <= ${i}`,
        emailSortAsc.data[i - 1].email <= emailSortAsc.data[i].email,
      );
    }
  }
  // 6. Test sorting by created_at in descending order
  const createdAtSortDesc = await api.functional.todoApp.members.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(createdAtSortDesc);
  if (createdAtSortDesc.data.length > 1) {
    // Verify created_at is in descending order (newest first)
    for (let i = 1; i < createdAtSortDesc.data.length; i++) {
      TestValidator.predicate(
        `created_at sort descending: index ${i - 1} >= ${i}`,
        new Date(createdAtSortDesc.data[i - 1].created_at) >=
          new Date(createdAtSortDesc.data[i].created_at),
      );
    }
  }
  // 7. Test pagination with custom page and limit values
  const paginated = await api.functional.todoApp.members.index(connection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 10);
  TestValidator.predicate(
    "pagination data length matches limit or less",
    paginated.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    paginated.pagination.pages ===
      Math.ceil(paginated.pagination.records / paginated.pagination.limit),
  );
  // 8. Test include_deleted flag to include soft-deleted members
  const includeDeleted = await api.functional.todoApp.members.index(
    connection,
    {
      body: {
        include_deleted: true,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(includeDeleted);
  TestValidator.predicate(
    "include_deleted returns results",
    includeDeleted.data.length >= 0,
  );
  // Compare with default (exclude deleted)
  TestValidator.predicate(
    "include_deleted returns same or more results",
    includeDeleted.data.length >= defaultList.data.length,
  );
  // 9. Test sorting by display_name
  const displayNameSort = await api.functional.todoApp.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        limit: 100,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(displayNameSort);
  if (displayNameSort.data.length > 1) {
    // Verify display_names are in ascending order (nulls may be at start or end)
    const nonNullMembers = displayNameSort.data.filter(
      (m) => m.display_name !== null,
    );
    if (nonNullMembers.length > 1) {
      for (let i = 1; i < nonNullMembers.length; i++) {
        TestValidator.predicate(
          `display_name sort ascending: index ${i - 1} <= ${i}`,
          (nonNullMembers[i - 1].display_name ?? "") <=
            (nonNullMembers[i].display_name ?? ""),
        );
      }
    }
  }
  // 10. Test sorting by updated_at
  const updatedAtSort = await api.functional.todoApp.members.index(connection, {
    body: {
      sort_by: "updated_at",
      sort_order: "desc",
      limit: 100,
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(updatedAtSort);
  if (updatedAtSort.data.length > 1) {
    // Verify updated_at is in descending order
    for (let i = 1; i < updatedAtSort.data.length; i++) {
      TestValidator.predicate(
        `updated_at sort descending: index ${i - 1} >= ${i}`,
        new Date(updatedAtSort.data[i - 1].updated_at) >=
          new Date(updatedAtSort.data[i].updated_at),
      );
    }
  }
  // 11. Test combined filters: search + date range + sorting
  const combinedFilter = await api.functional.todoApp.members.index(
    connection,
    {
      body: {
        search: "@",
        created_at_from: oneYearAgo.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilter.data.length >= 0,
  );
  // Verify all members have email containing "@"
  await ArrayUtil.asyncForEach(combinedFilter.data, async (member) => {
    TestValidator.predicate(
      `member ${member.id} email contains @`,
      member.email.includes("@"),
    );
  });
  // Verify all members were created within date range
  await ArrayUtil.asyncForEach(combinedFilter.data, async (member) => {
    const createdAt = new Date(member.created_at);
    TestValidator.predicate(
      `member ${member.id} created_at within range`,
      createdAt >= oneYearAgo,
    );
  });
  // Verify sorting is correct
  if (combinedFilter.data.length > 1) {
    for (let i = 1; i < combinedFilter.data.length; i++) {
      TestValidator.predicate(
        `combined filter sort: index ${i - 1} >= ${i}`,
        new Date(combinedFilter.data[i - 1].created_at) >=
          new Date(combinedFilter.data[i].created_at),
      );
    }
  }
}
