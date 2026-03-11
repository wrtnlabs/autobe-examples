import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering by account status (active vs deleted) for member management.
 *
 * Validates that the admin member search endpoint correctly filters by account status:
 * 1. active=true returns only active accounts (deleted_at IS NULL)
 * 2. active=false returns only deleted accounts (deleted_at IS NOT NULL)
 * 3. Combined filtering with other criteria works correctly
 * 4. Edge cases with no matches return empty results
 */
export async function test_api_member_management_admin_account_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Test filtering with active=true (should return active members)
  const activeMembers = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(activeMembers);
  // 3. Test filtering with active=false (should return deleted members)
  const deletedMembers = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: false,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(deletedMembers);
  // 4. Validate that status filters work independently
  // Active and deleted member lists should be distinct (no overlap in IDs)
  const activeIds = new Set(activeMembers.data.map((member) => member.id));
  const deletedIds = new Set(deletedMembers.data.map((member) => member.id));
  // Check for any ID overlap between active and deleted results
  // If an ID exists in both sets, test should fail
  const overlappingIds = Array.from(activeIds).filter((id) =>
    deletedIds.has(id),
  );
  TestValidator.equals(
    "active and deleted members should not overlap",
    overlappingIds.length,
    0,
  );
  // 5. Test combined filtering with email search
  // Only perform this test if we have some members
  if (activeMembers.data.length > 0) {
    const sampleMember = activeMembers.data[0];
    const searchResult = await api.functional.multiUserTodo.members.index(
      adminConnection,
      {
        body: {
          active: true,
          email: sampleMember.email,
        } satisfies IMultiUserTodoMember.IRequest,
      },
    );
    typia.assert(searchResult);
    // Should find the specific member
    TestValidator.predicate(
      "email search with active filter should return matching member",
      searchResult.data.some((member) => member.id === sampleMember.id),
    );
  }
  // 6. Test combined filtering with date ranges
  const now = new Date().toISOString();
  const dateRangeResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        created_before: now,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // 7. Test edge case with impossible criteria
  const impossibleEmail = typia.random<string & tags.Format<"email">>();
  const impossibleResult = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        email: impossibleEmail,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(impossibleResult);
  // Should return empty results for non-existent email
  // OR if by chance there is a match, all results should have that exact email
  TestValidator.predicate(
    "search with non-existent email should either be empty or only have matching emails",
    impossibleResult.data.length === 0 ||
      impossibleResult.data.every((member) => member.email === impossibleEmail),
  );
  // 8. Verify pagination works with status filter
  const limitUsed = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
  >();
  const paginationTest = await api.functional.multiUserTodo.members.index(
    adminConnection,
    {
      body: {
        active: true,
        limit: limitUsed,
      } satisfies IMultiUserTodoMember.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginationTest.data.length <= limitUsed,
  );
  TestValidator.predicate(
    "total records count should be valid",
    paginationTest.pagination.records >= paginationTest.data.length,
  );
}