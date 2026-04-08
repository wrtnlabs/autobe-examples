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
 * Test retrieving a paginated list of active (non-deleted) member accounts.
 *
 * Validates the member listing endpoint returns correct pagination metadata and member summaries for active accounts. Ensures that soft-deleted members are excluded by default and that all required fields are present in the response.
 *
 * Special attention is given to verifying that deleted_at is null for all active members and that pagination metadata accurately reflects the total count and page navigation.
 *
 * 1. Call PATCH /todoApp/members with default parameters to retrieve all active members.
 * 2. Verify response contains pagination metadata (current, limit, records, pages).
 * 3. Verify each member summary contains required fields and deleted_at is null.
 * 4. Test pagination by requesting specific page and limit values.
 * 5. Verify pagination metadata reflects correct current page and total pages.
 * 6. Verify paginated members are distinct across pages.
 */
export async function test_api_member_list_active_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve all active members with default parameters
  const allMembers = await api.functional.todoApp.members.index(connection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  typia.assert(allMembers);
  // 2. Verify pagination metadata has valid values
  TestValidator.predicate(
    "pagination current page is at least 1",
    allMembers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allMembers.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allMembers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    allMembers.pagination.pages >= 0,
  );
  // 3. Verify all returned members are active (deleted_at = null)
  for (const member of allMembers.data) {
    TestValidator.equals(
      `member ${member.id} is active (deleted_at is null)`,
      member.deleted_at,
      null,
    );
  }
  // 4. Test pagination with specific limit
  const paginatedMembers = await api.functional.todoApp.members.index(
    connection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies ITodoAppMember.IRequest,
    },
  );
  typia.assert(paginatedMembers);
  // 5. Verify pagination respects limit
  TestValidator.predicate(
    "paginated data length does not exceed limit",
    paginatedMembers.data.length <= paginatedMembers.pagination.limit,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedMembers.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedMembers.pagination.limit,
    2,
  );
  // 6. Verify all paginated members are also active
  for (const member of paginatedMembers.data) {
    TestValidator.equals(
      `paginated member ${member.id} is active`,
      member.deleted_at,
      null,
    );
  }
  // 7. Test page 2 pagination (if enough records exist)
  if (allMembers.pagination.pages >= 2) {
    const page2Members = await api.functional.todoApp.members.index(
      connection,
      {
        body: {
          limit: 2,
          page: 2,
        } satisfies ITodoAppMember.IRequest,
      },
    );
    typia.assert(page2Members);
    TestValidator.equals(
      "page 2 current page is 2",
      page2Members.pagination.current,
      2,
    );
    // Verify page 2 members are different from page 1
    const page1Ids = new Set(paginatedMembers.data.map((m) => m.id));
    for (const member of page2Members.data) {
      TestValidator.predicate(
        `page 2 member ${member.id} is not in page 1`,
        !page1Ids.has(member.id),
      );
      TestValidator.equals(
        `page 2 member ${member.id} is active`,
        member.deleted_at,
        null,
      );
    }
  }
  // 8. Verify pagination consistency: records should match expected calculation
  TestValidator.predicate(
    "total records is consistent with pages calculation",
    allMembers.pagination.records === 0
      ? allMembers.pagination.pages === 0
      : allMembers.pagination.pages ===
          Math.ceil(
            allMembers.pagination.records / allMembers.pagination.limit,
          ),
  );
}
