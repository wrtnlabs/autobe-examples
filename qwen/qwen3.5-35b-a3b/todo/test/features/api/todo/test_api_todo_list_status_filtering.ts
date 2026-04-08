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

export async function test_api_todo_list_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Test status="all" filter
  const allResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: { status: "all" },
    },
  );
  typia.assert(allResult);
  TestValidator.predicate(
    "all filter returns valid pagination",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "all filter has data array",
    Array.isArray(allResult.data),
  );
  // 3. Test status="complete" filter
  const completeResult = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    { body: { status: "complete" } },
  );
  typia.assert(completeResult);
  TestValidator.predicate(
    "complete filter returns valid pagination",
    completeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complete filter has data array",
    Array.isArray(completeResult.data),
  );
  completeResult.data.forEach((todo) => {
    TestValidator.predicate(
      "todo in complete filter is complete",
      todo.is_complete === true,
    );
  });
  // 4. Test status="incomplete" filter
  const incompleteResult =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: { status: "incomplete" },
    });
  typia.assert(incompleteResult);
  TestValidator.predicate(
    "incomplete filter returns valid pagination",
    incompleteResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "incomplete filter has data array",
    Array.isArray(incompleteResult.data),
  );
  incompleteResult.data.forEach((todo) => {
    TestValidator.predicate(
      "todo in incomplete filter is incomplete",
      todo.is_complete === false,
    );
  });
  // 5. Verify filter counts are consistent
  TestValidator.predicate(
    "total todos equals complete + incomplete",
    allResult.pagination.records ===
      completeResult.pagination.records + incompleteResult.pagination.records,
  );
  // 6. Verify pagination structure
  TestValidator.predicate(
    "pagination has correct fields",
    allResult.pagination.current !== undefined &&
      allResult.pagination.limit !== undefined &&
      allResult.pagination.records !== undefined &&
      allResult.pagination.pages !== undefined,
  );
  // 7. Verify data contains expected fields
  if (allResult.data.length > 0) {
    const sampleTodo = allResult.data[0];
    TestValidator.predicate("todo has id", sampleTodo.id !== undefined);
    TestValidator.predicate("todo has title", sampleTodo.title !== undefined);
    TestValidator.predicate(
      "todo has is_complete",
      sampleTodo.is_complete !== undefined,
    );
    TestValidator.predicate(
      "todo has created_at",
      sampleTodo.created_at !== undefined,
    );
    TestValidator.predicate("todo has author", sampleTodo.author !== undefined);
  }
}
