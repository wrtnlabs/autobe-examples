import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_email_verification_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Use connection directly since no admin utility functions available
  // This tests the endpoint with empty result scenarios
  // Test 1: Search with non-existent email address
  const emptyResult1 =
    await api.functional.multiUserTodo.member_email_verifications.index(
      connection,
      {
        body: {
          email: "nonexistent@example.com",
          pagination: {
            page: 1,
            limit: 10,
          },
        } satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult1);
  // Validate empty result structure
  TestValidator.equals("data array empty", emptyResult1.data.length, 0);
  TestValidator.equals("current page is 1", emptyResult1.pagination.current, 1);
  TestValidator.equals(
    "records count is 0",
    emptyResult1.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", emptyResult1.pagination.pages, 0);
  TestValidator.equals(
    "limit matches request",
    emptyResult1.pagination.limit,
    10,
  );
  // Test 2: Search with non-existent member_id
  const emptyResult2 =
    await api.functional.multiUserTodo.member_email_verifications.index(
      connection,
      {
        body: {
          member_id: "00000000-0000-0000-0000-000000000000",
          pagination: {
            page: 1,
            limit: 50,
          },
        } satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult2);
  // Validate empty result structure
  TestValidator.equals(
    "data array empty for member_id filter",
    emptyResult2.data.length,
    0,
  );
  TestValidator.equals("current page is 1", emptyResult2.pagination.current, 1);
  TestValidator.equals(
    "records count is 0 for member_id filter",
    emptyResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 for member_id filter",
    emptyResult2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit matches request",
    emptyResult2.pagination.limit,
    50,
  );
  // Test 3: Search with combination of filters that won't match
  const emptyResult3 =
    await api.functional.multiUserTodo.member_email_verifications.index(
      connection,
      {
        body: {
          email: "another.nonexistent@example.com",
          status: "active",
          member_id: "11111111-1111-1111-1111-111111111111",
          date_range: {
            start_date: new Date(2000, 0, 1).toISOString(),
            end_date: new Date(2001, 0, 1).toISOString(),
          },
          pagination: {
            page: 2,
            limit: 100,
          },
        } satisfies IMultiUserTodoMemberEmailVerification.IRequest,
      },
    );
  typia.assert(emptyResult3);
  // Validate empty result structure
  TestValidator.equals(
    "data array empty for combined filters",
    emptyResult3.data.length,
    0,
  );
  TestValidator.equals("current page is 2", emptyResult3.pagination.current, 2);
  TestValidator.equals(
    "records count is 0 for combined filters",
    emptyResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 for combined filters",
    emptyResult3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit matches request",
    emptyResult3.pagination.limit,
    100,
  );
  // Test 4: Verify response structure consistency (data and pagination always present)
  TestValidator.predicate(
    "response has data field",
    () => "data" in emptyResult1,
  );
  TestValidator.predicate(
    "response has pagination field",
    () => "pagination" in emptyResult1,
  );
  TestValidator.predicate("data is array type", () =>
    Array.isArray(emptyResult1.data),
  );
}
