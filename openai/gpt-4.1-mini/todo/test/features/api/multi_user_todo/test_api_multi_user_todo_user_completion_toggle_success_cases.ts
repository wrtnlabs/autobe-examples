import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_multi_user_todo_user_completion_toggle_success_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Toggle todo completion from incomplete to complete
  {
    // Join as first user
    const user1Connection: api.IConnection = { host: connection.host };
    const authorized1 = await authorize_user_join(user1Connection, {
      body: {}, // IMultiUserTodoUser.IJoin has empty object
    });
    user1Connection.headers = {
      Authorization: `Bearer ${authorized1.token.access}`,
    };
    // Create todo with minimal fields to ensure incomplete
    const todo1Raw = await generate_random_multi_user_todo_user_todos_create(
      user1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          start_date: null,
          due_date: null,
        },
      },
    );
    const todo1 = typia.assert(todo1Raw) as IMultiUserTodoTodo & { id: string; completed: boolean; title: string; description: string | null; start_date: string | null; due_date: string | null };
    // Ensure todo initially incomplete
    TestValidator.equals(
      "initial todo completion should be false",
      todo1.completed,
      false,
    );
    // Toggle completion
    const toggled1Raw =
      await api.functional.multiUserTodo.user.completion.toggle.toggleCompletion(
        user1Connection,
        {
          body: {
            id: todo1.id,
          } satisfies IMultiUserTodoTodo.IToggleCompletionRequest,
        },
      );
    const toggled1 = typia.assert(toggled1Raw) as typeof todo1;
    // Validate fields: completed true and other fields unchanged
    TestValidator.equals("todo id unchanged", toggled1.id, todo1.id);
    TestValidator.equals("todo title unchanged", toggled1.title, todo1.title);
    TestValidator.equals(
      "todo description unchanged",
      toggled1.description,
      todo1.description,
    );
    TestValidator.equals(
      "todo start_date unchanged",
      toggled1.start_date,
      todo1.start_date,
    );
    TestValidator.equals(
      "todo due_date unchanged",
      toggled1.due_date,
      todo1.due_date,
    );
    TestValidator.equals(
      "todo completion toggled true",
      toggled1.completed,
      true,
    );
    // Confirm authorization: create second user
    const user2Connection: api.IConnection = { host: connection.host };
    const authorized2 = await authorize_user_join(user2Connection, {
      body: {},
    });
    user2Connection.headers = {
      Authorization: `Bearer ${authorized2.token.access}`,
    };
    // User2 tries to toggle user1's todo - should error
    await TestValidator.error("user2 cannot toggle user1's todo", async () => {
      await api.functional.multiUserTodo.user.completion.toggle.toggleCompletion(
        user2Connection,
        {
          body: {
            id: todo1.id,
          } satisfies IMultiUserTodoTodo.IToggleCompletionRequest,
        },
      );
    });
  }
  // Scenario 2: Toggle todo completion from complete to incomplete
  {
    // Join as third user
    const user3Connection: api.IConnection = { host: connection.host };
    const authorized3 = await authorize_user_join(user3Connection, {
      body: {},
    });
    user3Connection.headers = {
      Authorization: `Bearer ${authorized3.token.access}`,
    };
    // Create todo incomplete
    const todo2Raw = await generate_random_multi_user_todo_user_todos_create(
      user3Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          start_date: null,
          due_date: null,
        },
      },
    );
    const todo2 = typia.assert(todo2Raw) as IMultiUserTodoTodo & { id: string; completed: boolean; title: string; description: string | null; start_date: string | null; due_date: string | null };
    // Toggle to complete
    const toggled2FirstRaw =
      await api.functional.multiUserTodo.user.completion.toggle.toggleCompletion(
        user3Connection,
        {
          body: {
            id: todo2.id,
          } satisfies IMultiUserTodoTodo.IToggleCompletionRequest,
        },
      );
    const toggled2First = typia.assert(toggled2FirstRaw) as typeof todo2;
    TestValidator.equals(
      "todo completion toggled true",
      toggled2First.completed,
      true,
    );
    // Toggle back to incomplete
    const toggled2SecondRaw =
      await api.functional.multiUserTodo.user.completion.toggle.toggleCompletion(
        user3Connection,
        {
          body: {
            id: todo2.id,
          } satisfies IMultiUserTodoTodo.IToggleCompletionRequest,
        },
      );
    const toggled2Second = typia.assert(toggled2SecondRaw) as typeof todo2;
    // Validate fields: completed false and other fields unchanged
    TestValidator.equals("todo id unchanged", toggled2Second.id, todo2.id);
    TestValidator.equals(
      "todo title unchanged",
      toggled2Second.title,
      todo2.title,
    );
    TestValidator.equals(
      "todo description unchanged",
      toggled2Second.description,
      todo2.description,
    );
    TestValidator.equals(
      "todo start_date unchanged",
      toggled2Second.start_date,
      todo2.start_date,
    );
    TestValidator.equals(
      "todo due_date unchanged",
      toggled2Second.due_date,
      todo2.due_date,
    );
    TestValidator.equals(
      "todo completion toggled false",
      toggled2Second.completed,
      false,
    );
    // Confirm authorization: user1 cannot toggle user3's todo
    const user1Connection: api.IConnection = { host: connection.host };
    const authorized1again = await authorize_user_join(user1Connection, {
      body: {},
    });
    user1Connection.headers = {
      Authorization: `Bearer ${authorized1again.token.access}`,
    };
    await TestValidator.error("user1 cannot toggle user3's todo", async () => {
      await api.functional.multiUserTodo.user.completion.toggle.toggleCompletion(
        user1Connection,
        {
          body: {
            id: todo2.id,
          } satisfies IMultiUserTodoTodo.IToggleCompletionRequest,
        },
      );
    });
  }
}
