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

export async function test_api_todo_creation_success_default_incomplete(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(auth);
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 2 });
  const todoStartDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const todoDueDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24,
  ).toISOString();
  const createBody = {
    title: todoTitle,
    description: todoDescription,
    startDate: todoStartDate,
    dueDate: todoDueDate,
  } satisfies IMultiUserTodoTodo.ICreate;
  const created = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(created);
  TestValidator.equals("title matches", created.title, todoTitle);
  TestValidator.equals(
    "description matches",
    created.description,
    todoDescription,
  );
  TestValidator.equals("startDate matches", created.start_date, todoStartDate);
  TestValidator.equals("dueDate matches", created.due_date, todoDueDate);
  TestValidator.equals("isComplete default false", created.is_complete, false);
  TestValidator.equals("deletedAt null", created.deleted_at, null);
  TestValidator.predicate(
    "lifecycleState exists",
    created.lifecycle_state.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    Number.isFinite(Date.parse(created.created_at)),
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    Number.isFinite(Date.parse(created.updated_at)),
  );
  TestValidator.predicate("not deleted invariant", created.deleted_at === null);
}
