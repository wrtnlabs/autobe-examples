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

export async function test_api_member_account_deletion_email_reuse_available(
  connection: api.IConnection,
): Promise<void> {
  // Store the email for reuse testing
  const email = typia.random<
    string & tags.MinLength<1> & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register initial member with specific email
  const memberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(firstMember);
  const firstMemberId = firstMember.id;
  // Step 2: Create a todo to ensure account has associated data
  await generate_random_multi_user_todo_member_todos_create(memberConnection, {
    body: {
      title: RandomGenerator.name(),
    },
  });
  // Step 3: Delete the account - this should return 200 OK
  await api.functional.multiUserTodo.member.account.erase(memberConnection);
  // Step 4: Register new member with same email
  const newMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(newMemberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16), // Different password is fine
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(secondMember);
  const secondMemberId = secondMember.id;
  // Validate that re-registration succeeded with different ID
  TestValidator.notEquals(
    "new member has different ID",
    firstMemberId,
    secondMemberId,
  );
  // Validate that new member has valid authentication tokens
  typia.assert(secondMember.token);
}
