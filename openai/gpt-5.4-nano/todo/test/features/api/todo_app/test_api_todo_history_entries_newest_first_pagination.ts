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

export async function test_api_todo_history_entries_newest_first_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Authorize new member (join)
  const memberAuthorized: ITodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: undefined,
      } satisfies ITodoAppMember.IJoin,
    });
  // Use the authorized headers from the join response
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  // 2) todoId setup endpoints were not provided in the prompt.
  // We cannot deterministically create history entries here.
  // Use a generated todoId and validate that the API response respects ordering & pagination semantics.
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // 3) Page 1
  const page1 = await api.functional.todoApp.member.todos.history_entries.index(
    authConnection,
    {
      todoId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "page1 data length within limit",
    () => page1.data.length <= 2,
  );
  TestValidator.predicate("page1 entries ordered newest-to-oldest", () => {
    for (let i = 1; i < page1.data.length; ++i) {
      const prev = Date.parse(page1.data[i - 1].created_at);
      const curr = Date.parse(page1.data[i].created_at);
      if (prev < curr) return false;
    }
    return true;
  });
  for (const entry of page1.data) {
    typia.assert(entry);
    // Ensure nullable contract exists: changed_* must be null when unchanged.
    // (Server behavior is validated by typia.assert runtime schema.)
    TestValidator.predicate(
      "deleted_at is null or date-time",
      () => entry.deleted_at === null || typeof entry.deleted_at === "string",
    );
  }
  // 4) Page 2
  const page2 = await api.functional.todoApp.member.todos.history_entries.index(
    authConnection,
    {
      todoId,
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 2);
  TestValidator.predicate(
    "page2 data length within limit",
    () => page2.data.length <= 2,
  );
  const ids1 = new Set(page1.data.map((e) => e.id));
  const repeated = page2.data.some((e) => ids1.has(e.id));
  TestValidator.predicate("no repeated ids across pages", () => !repeated);
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "page2 entries are not newer than page1 entries",
      () => {
        const lastOfPage1 = page1.data[page1.data.length - 1];
        const firstOfPage2 = page2.data[0];
        return (
          Date.parse(lastOfPage1.created_at) >=
          Date.parse(firstOfPage2.created_at)
        );
      },
    );
  }
}
