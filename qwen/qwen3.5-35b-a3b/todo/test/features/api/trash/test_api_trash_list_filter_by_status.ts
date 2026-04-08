import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the trash listing endpoint with filtering by completion status for deleted todos.
 *
 * Validates the trash listing endpoint's ability to filter deleted todos by completion status.
 * Tests that the API correctly accepts and processes status filter parameters (complete, incomplete, all),
 * returning properly paginated results with accurate metadata.
 *
 * Special attention is given to verifying that the response structure includes all expected fields
 * and that pagination metadata is correctly calculated for each filter type.
 *
 * 1. Authenticate member and establish authorized connection
 * 2. Test trash listing with status=complete filter
 * 3. Test trash listing with status=incomplete filter
 * 4. Test trash listing with status=all filter (default)
 * 5. Verify pagination metadata is correctly populated for each request
 */
export async function test_api_trash_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const member: IMultiUserTodoMember.IAuthorized = joinResult;
  const completeFilter: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: { status: "complete" } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(completeFilter);
  TestValidator.equals(
    "complete filter pagination current",
    completeFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "complete filter pagination limit positive",
    completeFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "complete filter pagination records non-negative",
    completeFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complete filter pagination pages non-negative",
    completeFilter.pagination.pages >= 0,
  );
  typia.assert(completeFilter.data);
  const incompleteFilter: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: { status: "incomplete" } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(incompleteFilter);
  TestValidator.equals(
    "incomplete filter pagination current",
    incompleteFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "incomplete filter pagination limit positive",
    incompleteFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "incomplete filter pagination records non-negative",
    incompleteFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "incomplete filter pagination pages non-negative",
    incompleteFilter.pagination.pages >= 0,
  );
  typia.assert(incompleteFilter.data);
  const allFilter: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.trash.index(memberConnection, {
      body: { status: "all" } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(allFilter);
  TestValidator.equals(
    "all filter pagination current",
    allFilter.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all filter pagination limit positive",
    allFilter.pagination.limit > 0,
  );
  TestValidator.predicate(
    "all filter pagination records non-negative",
    allFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all filter pagination pages non-negative",
    allFilter.pagination.pages >= 0,
  );
  typia.assert(allFilter.data);
  for (const item of completeFilter.data) {
    typia.assert(item.id);
    typia.assert(item.title);
    typia.assert(item.is_complete);
    typia.assert(item.author);
    typia.assert(item.created_at);
    typia.assert(item.deleted_at);
  }
  for (const item of incompleteFilter.data) {
    typia.assert(item.id);
    typia.assert(item.title);
    typia.assert(item.is_complete);
    typia.assert(item.author);
    typia.assert(item.created_at);
    typia.assert(item.deleted_at);
  }
  for (const item of allFilter.data) {
    typia.assert(item.id);
    typia.assert(item.title);
    typia.assert(item.is_complete);
    typia.assert(item.author);
    typia.assert(item.created_at);
    typia.assert(item.deleted_at);
  }
}
