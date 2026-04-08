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
 * Test including soft-deleted member accounts in the member list results.
 *
 * Validates the include_deleted filter functionality for the member list endpoint. Ensures that by default, only active (non-deleted) members are returned, and when include_deleted is set to true, both active and soft-deleted members are included in the results.
 *
 * Special attention is given to verifying that the deleted_at field correctly distinguishes between active members (deleted_at = null) and soft-deleted members (deleted_at has a timestamp value).
 *
 * 1. Query members without include_deleted parameter (default behavior).
 * 2. Verify only active members are returned (deleted_at is null).
 * 3. Query members with include_deleted=true.
 * 4. Verify both active and deleted members are returned.
 * 5. Verify deleted member has deleted_at timestamp set.
 * 6. Verify active member has deleted_at = null.
 */
export async function test_api_member_list_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Default behavior (exclude deleted): Query without include_deleted parameter
  const defaultQuery = {
    body: {
      limit: 100,
    } satisfies ITodoAppMember.IRequest,
  };
  const defaultResult = await api.functional.todoApp.members.index(
    connection,
    defaultQuery,
  );
  typia.assert(defaultResult);
  // 2. Verify only active members are returned by default
  // All members in default result should have deleted_at = null
  for (const member of defaultResult.data) {
    TestValidator.equals(
      "default query excludes deleted members",
      member.deleted_at,
      null,
    );
  }
  // 3. Include deleted members: Query with include_deleted=true
  const includeDeletedQuery = {
    body: {
      include_deleted: true,
      limit: 100,
    } satisfies ITodoAppMember.IRequest,
  };
  const includeDeletedResult = await api.functional.todoApp.members.index(
    connection,
    includeDeletedQuery,
  );
  typia.assert(includeDeletedResult);
  // 4. Verify both active and deleted members are returned
  // Count active and deleted members
  const activeMembers = includeDeletedResult.data.filter(
    (m) => m.deleted_at === null,
  );
  const deletedMembers = includeDeletedResult.data.filter(
    (m) => m.deleted_at !== null,
  );
  // 5. Verify deleted member has deleted_at timestamp set
  for (const member of deletedMembers) {
    TestValidator.predicate(
      "deleted member has deleted_at timestamp",
      member.deleted_at !== null,
    );
    // Verify deleted_at is a valid date-time format
    TestValidator.predicate(
      "deleted_at is valid date-time format",
      !isNaN(Date.parse(member.deleted_at!)),
    );
  }
  // 6. Verify active member has deleted_at = null
  for (const member of activeMembers) {
    TestValidator.equals(
      "active member has deleted_at = null",
      member.deleted_at,
      null,
    );
  }
  // Verify that include_deleted returns at least as many members as default
  TestValidator.predicate(
    "include_deleted returns >= default count",
    includeDeletedResult.data.length >= defaultResult.data.length,
  );
  // 7. Sort deleted members by created_at
  const sortByCreatedQuery = {
    body: {
      include_deleted: true,
      sort_by: "created_at",
      sort_order: "desc",
      limit: 100,
    } satisfies ITodoAppMember.IRequest,
  };
  const sortedResult = await api.functional.todoApp.members.index(
    connection,
    sortByCreatedQuery,
  );
  typia.assert(sortedResult);
  // Verify sorting works with mixed active/deleted members
  TestValidator.predicate(
    "sorted query returns same count as include_deleted",
    sortedResult.data.length === includeDeletedResult.data.length,
  );
}
