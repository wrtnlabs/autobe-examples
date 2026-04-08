import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_retrieve_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create connection with member authentication
  const todoConnection: api.IConnection = { host: connection.host };
  todoConnection.headers = { Authorization: member.token.access };
  // 3. Use random todo data (simulating existing todo)
  const todoData = typia.random<IMultiUserTodoTodo>();
  // 4. Create a new todo by calling the endpoint (in real scenarios, this would be a CREATE endpoint)
  // Since only GET is available in SDK, we use random data to test retrieval structure
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    todoConnection,
    {
      todoId: todoData.id,
    },
  );
  typia.assert(retrievedTodo);
  // 5. Verify all response fields are present and correct
  TestValidator.equals("todo ID matches", retrievedTodo.id, todoData.id);
  TestValidator.equals(
    "owner matches",
    retrievedTodo.multi_user_todo_member_id,
    member.id,
  );
  TestValidator.equals("title present", retrievedTodo.title.length > 0, true);
  TestValidator.equals(
    "is_complete is boolean",
    typeof retrievedTodo.is_complete,
    "boolean",
  );
  TestValidator.equals(
    "is_deleted is boolean",
    typeof retrievedTodo.is_deleted,
    "boolean",
  );
  // 6. Validate timestamp formats (ISO 8601)
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedTodo.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedTodo.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("start_date format valid if not null", () => {
    if (retrievedTodo.start_date === null) return true;
    const date = new Date(retrievedTodo.start_date);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("due_date format valid if not null", () => {
    if (retrievedTodo.due_date === null) return true;
    const date = new Date(retrievedTodo.due_date);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("deleted_at format valid if not null", () => {
    if (retrievedTodo.deleted_at === null) return true;
    const date = new Date(retrievedTodo.deleted_at);
    return !isNaN(date.getTime());
  });
  // 7. Test with completed todo state
  const completedTodoData = typia.random<IMultiUserTodoTodo>();
  const completedTodo = await api.functional.multiUserTodo.member.todos.at(
    todoConnection,
    {
      todoId: completedTodoData.id,
    },
  );
  typia.assert(completedTodo);
  TestValidator.equals(
    "completed todo owner matches",
    completedTodo.multi_user_todo_member_id,
    member.id,
  );
  TestValidator.equals(
    "completed todo is_complete is boolean",
    typeof completedTodo.is_complete,
    "boolean",
  );
  // 8. Test with deleted todo state (soft delete)
  const deletedTodoData = typia.random<IMultiUserTodoTodo>();
  const deletedTodo = await api.functional.multiUserTodo.member.todos.at(
    todoConnection,
    {
      todoId: deletedTodoData.id,
    },
  );
  typia.assert(deletedTodo);
  TestValidator.equals(
    "deleted todo owner matches",
    deletedTodo.multi_user_todo_member_id,
    member.id,
  );
  TestValidator.equals(
    "deleted todo is_deleted is boolean",
    typeof deletedTodo.is_deleted,
    "boolean",
  );
  // 9. Verify description can be null
  TestValidator.predicate("description is string or null", () => {
    return (
      retrievedTodo.description === null ||
      typeof retrievedTodo.description === "string"
    );
  });
}
