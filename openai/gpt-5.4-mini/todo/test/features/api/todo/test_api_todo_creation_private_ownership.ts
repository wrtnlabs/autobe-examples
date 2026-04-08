import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_creation_private_ownership(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const body = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    startDate: null,
    dueDate: null,
  } satisfies ITodoAppTodo.ICreate;
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "todo title should match input",
    created.title,
    body.title,
  );
  TestValidator.equals(
    "todo description should be null when omitted",
    created.description,
    null,
  );
  TestValidator.equals(
    "todo start date should be null when omitted",
    created.startDate,
    null,
  );
  TestValidator.equals(
    "todo due date should be null when omitted",
    created.dueDate,
    null,
  );
  TestValidator.equals(
    "todo should be incomplete by default",
    created.isCompleted,
    false,
  );
  TestValidator.equals(
    "todo should not be soft deleted on create",
    created.deletedAt,
    null,
  );
}
