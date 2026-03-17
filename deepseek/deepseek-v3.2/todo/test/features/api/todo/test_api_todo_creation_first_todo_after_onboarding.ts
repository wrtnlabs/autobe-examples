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

export async function test_api_todo_creation_first_todo_after_onboarding(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account for onboarding scenario
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: `https://example.com/${RandomGenerator.alphabets(10)}` satisfies string &
        tags.Format<"uri">,
      referrer:
        `https://referrer.com/${RandomGenerator.alphabets(8)}` satisfies string &
          tags.Format<"uri">,
      ip: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}` satisfies string &
        tags.Format<"ipv4">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create the first todo after onboarding
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }) satisfies
          | string
          | null
          | undefined,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate the todo creation workflow
  TestValidator.equals(
    "todo should belong to the member who created it",
    todo.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email should match",
    todo.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name should match",
    todo.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "todo should not be completed by default",
    !todo.completed,
  );
}
