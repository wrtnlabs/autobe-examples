import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_restore_other_members_deleted_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(ownerAuth);
  const ownerTodo = await generate_random_todo_app_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(ownerTodo);
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(otherMemberAuth);
  let denied: api.HttpError | null = null;
  try {
    await api.functional.todoApp.member.todos.restore(otherMemberConnection, {
      todoId: ownerTodo.id,
    });
  } catch (exp) {
    if (exp instanceof api.HttpError) denied = exp;
    else throw exp;
  }
  TestValidator.predicate("other member restore is denied", denied !== null);
  TestValidator.predicate(
    "denial uses inaccessible-resource status",
    denied !== null && (denied.status === 403 || denied.status === 404),
  );
  if (denied !== null) {
    const payload = denied.toJSON<unknown>().message;
    TestValidator.notEquals(
      "denial payload does not disclose todo details",
      payload,
      ownerTodo,
    );
    if (typeof payload === "string") {
      TestValidator.predicate(
        "denial payload does not disclose target todo id",
        payload.includes(ownerTodo.id) === false,
      );
    }
  }
}
