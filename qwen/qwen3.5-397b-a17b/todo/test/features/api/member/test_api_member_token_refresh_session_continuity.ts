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

export async function test_api_member_token_refresh_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Create a todo item using the initial access token
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Store original member identity for comparison
  const originalMemberId: string & tags.Format<"uuid"> = authorized.id;
  const originalMemberEmail: string & tags.Format<"email"> = authorized.email;
  const originalMemberDisplayName: string = authorized.display_name;
  // 4. Perform token refresh to obtain new credentials
  const refreshed: ITodoAppMember.IAuthorized = await authorize_member_refresh(
    memberConnection,
    {
      body: {
        refresh: authorized.token.refresh,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 5. Validate member identity remains consistent after refresh
  TestValidator.equals(
    "member id consistent after refresh",
    refreshed.id,
    originalMemberId,
  );
  TestValidator.equals(
    "member email consistent after refresh",
    refreshed.email,
    originalMemberEmail,
  );
  TestValidator.equals(
    "member display name consistent after refresh",
    refreshed.display_name,
    originalMemberDisplayName,
  );
  // 6. Verify the new access token is different (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
  // 7. Verify todo ownership confirms session continuity
  TestValidator.equals(
    "todo owner matches member",
    todo.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "todo owner display name matches",
    todo.member.display_name,
    originalMemberDisplayName,
  );
}
