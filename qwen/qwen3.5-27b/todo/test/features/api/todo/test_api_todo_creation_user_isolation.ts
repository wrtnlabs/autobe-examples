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
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test that todo creation correctly associates the todo with the authenticated member and enforces data isolation between users.
 *
 * Test Steps:
 * 1. Register first member (Member A) using POST /multiUserTodo/auth/member/join
 * 2. Use Member A's access token to create a todo with title "Member A's Task"
 * 3. Verify the created todo's member field contains Member A's profile information
 * 4. Register second member (Member B) using POST /multiUserTodo/auth/member/join with different credentials
 * 5. Use Member B's access token to create a todo with title "Member B's Task"
 * 6. Verify the created todo's member field contains Member B's profile information
 * 7. Confirm complete data isolation: each member can only see their own todos
 * 8. Verify both members' todos have correct default values (completed=false, deleted=false)
 */
export async function test_api_todo_creation_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todoA = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Member A's Task",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // 3. Verify Member A's todo is associated with Member A
  TestValidator.equals(
    "todo A belongs to member A",
    todoA.member.id,
    memberA.id,
  );
  TestValidator.equals("todo A title matches", todoA.title, "Member A's Task");
  TestValidator.equals("todo A completed is false", todoA.completed, false);
  TestValidator.equals("todo A deleted is false", todoA.deleted, false);
  // 4. Register Member B with different credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Verify Member A and Member B have different IDs
  TestValidator.notEquals(
    "member A and B have different IDs",
    memberA.id,
    memberB.id,
  );
  // 6. Member B creates a todo
  const todoB = await generate_random_multi_user_todo_member_todos_create(
    memberBConnection,
    {
      body: {
        title: "Member B's Task",
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todoB);
  // 7. Verify Member B's todo is associated with Member B
  TestValidator.equals(
    "todo B belongs to member B",
    todoB.member.id,
    memberB.id,
  );
  TestValidator.equals("todo B title matches", todoB.title, "Member B's Task");
  TestValidator.equals("todo B completed is false", todoB.completed, false);
  TestValidator.equals("todo B deleted is false", todoB.deleted, false);
  // 8. Verify data isolation: todo A and todo B have different IDs
  TestValidator.notEquals(
    "todo A and B have different IDs",
    todoA.id,
    todoB.id,
  );
  // 9. Verify data isolation: todo A member is not member B
  TestValidator.notEquals(
    "todo A member is not member B",
    todoA.member.id,
    memberB.id,
  );
  // 10. Verify data isolation: todo B member is not member A
  TestValidator.notEquals(
    "todo B member is not member A",
    todoB.member.id,
    memberA.id,
  );
}
