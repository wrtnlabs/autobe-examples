import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_history_field_change_reflects_single_edit(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that PATCH /todoApp/member/todos/{todoId}/history
  // returns a paginated edit-history timeline with correct field nullability
  // semantics at the schema level for member-owned todos.
  //
  // NOTE: The provided materials include only member join and the history
  // retrieval endpoint; todo creation/edit endpoints are not available here.
  // Therefore, this test exercises the history endpoint contract.
  // 1) Authorize a member (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  // 2) Call history retrieval with pagination returning up to 100 entries
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.todoApp.member.todos.history.index(
    memberConnection,
    {
      todoId,
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(history);
  // 3) Validate pagination metadata sanity
  TestValidator.equals(
    "pagination.current should match request page",
    history.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match request limit",
    history.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length should be <= requested limit",
    history.data.length <= 100,
  );
  // 4) Validate newest entry exists and has created_at
  TestValidator.predicate(
    "history.data should contain at least 1 entry",
    history.data.length > 0,
  );
  const newest = history.data[0]!;
  typia.assert(newest);
  TestValidator.predicate(
    "newest.created_at should be non-empty",
    newest.created_at.length > 0,
  );
}
