import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Test empty result set
  const emptyResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  // 3. Test pagination with page beyond available data
  const beyondPageResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          page: 999,
          limit: 10,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page records",
    beyondPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page data empty",
    beyondPageResult.data.length,
    0,
  );
  // 4. Test limit enforcement at maximum (100)
  const maxLimitResult =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          limit: 100,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "limit respected",
    maxLimitResult.pagination.limit <= 100,
  );
  // 5. Test sorting by created_at descending (default)
  const sortByCreatedAtDesc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  // 6. Test sorting by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  // 7. Test sorting by expires_at descending
  const sortByExpiresAtDesc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "expires_at",
          sort_order: "desc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByExpiresAtDesc);
  // 8. Test sorting by expires_at ascending
  const sortByExpiresAtAsc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByExpiresAtAsc);
  // 9. Test sorting by id descending
  const sortByIdDesc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "id",
          sort_order: "desc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByIdDesc);
  // 10. Test sorting by id ascending
  const sortByAsc =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          sort_by: "id",
          sort_order: "asc",
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(sortByAsc);
  // 11. Test pagination metadata consistency
  const page1Result =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.predicate(
    "page 1 limit positive",
    page1Result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Result.pagination.pages >= 0,
  );
  TestValidator.equals(
    "page 1 data matches records",
    page1Result.data.length,
    Math.min(page1Result.pagination.records, page1Result.pagination.limit),
  );
  // 12. Test different page numbers
  const page2Result =
    await api.functional.multiUserTodo.member.password_resets.index(
      memberConnection,
      {
        body: {
          multi_user_todo_member_id: auth.id,
          page: 2,
          limit: 20,
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
}
