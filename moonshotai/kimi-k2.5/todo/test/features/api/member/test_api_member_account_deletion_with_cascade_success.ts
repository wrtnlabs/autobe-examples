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
 * Test the successful permanent deletion of a member account with cascade success.
 *
 * Validates that when a member account is deleted:
 * 1. The account deletion API returns success
 * 2. Session is terminated (subsequent authenticated requests fail)
 * 3. Email address becomes available for new registration (proving cascade deletion removed constraint)
 *
 * @param connection Base connection for API requests
 */
export async function test_api_member_account_deletion_with_cascade_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<
    string & tags.MinLength<1> & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create multiple todos (data to be cascaded on deletion)
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(todo2);
  // Step 3: Execute account deletion (permanent with cascade)
  await api.functional.multiUserTodo.member.account.erase(memberConnection);
  // Step 4: Verify session termination - authenticated operations should fail
  await TestValidator.httpError(
    "should return 401 for deleted member session",
    401,
    async () => {
      await generate_random_multi_user_todo_member_todos_create(
        memberConnection,
        { body: {} },
      );
    },
  );
  // Step 5: Verify email is available for re-registration (cascade removed unique constraint)
  const newMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email, // Same email as deleted account - should succeed
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"url">>(),
        referrer: typia.random<string & tags.Format<"url">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(newMember);
  // Verify it's a new member with different ID (not the same account restored)
  TestValidator.notEquals(
    "member ID should be different",
    member.id,
    newMember.id,
  );
}
