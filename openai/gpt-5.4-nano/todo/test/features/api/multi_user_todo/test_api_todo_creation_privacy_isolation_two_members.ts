import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_creation_privacy_isolation_two_members(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      display_name: "member A",
      password: "Password1234!",
      href: "https://example.com/memberA",
      referrer: "https://example.com/refA",
      ip: "192.0.2.10",
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberAAuthorized);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      display_name: "member B",
      password: "Password5678!",
      href: "https://example.com/memberB",
      referrer: "https://example.com/refB",
      ip: "192.0.2.20",
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(memberBAuthorized);
  const todoA = await api.functional.multiUserTodo.member.todos.create(
    memberAConnection,
    {
      body: {
        title: "title A",
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoA);
  const todoB = await api.functional.multiUserTodo.member.todos.create(
    memberBConnection,
    {
      body: {
        title: "title B",
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoB);
  TestValidator.equals("member A todo title", todoA.title, "title A");
  TestValidator.notEquals(
    "member A todo title must differ from member B title",
    todoA.title,
    todoB.title,
  );
  TestValidator.equals("member B todo title", todoB.title, "title B");
  TestValidator.notEquals(
    "member B todo title must differ from member A title",
    todoB.title,
    todoA.title,
  );
  TestValidator.equals("member A todo is incomplete", todoA.is_complete, false);
  TestValidator.equals(
    "member A todo deletedAt is null",
    todoA.deleted_at,
    null,
  );
  TestValidator.equals("member B todo is incomplete", todoB.is_complete, false);
  TestValidator.equals(
    "member B todo deletedAt is null",
    todoB.deleted_at,
    null,
  );
  TestValidator.equals(
    "default lifecycle_state should match across members",
    todoA.lifecycle_state,
    todoB.lifecycle_state,
  );
  TestValidator.predicate(
    "lifecycle_state is set",
    todoA.lifecycle_state.length > 0 && todoB.lifecycle_state.length > 0,
  );
}
