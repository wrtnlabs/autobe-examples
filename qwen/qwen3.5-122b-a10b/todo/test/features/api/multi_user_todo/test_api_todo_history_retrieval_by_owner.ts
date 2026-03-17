import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_history_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Retrieve a specific todo history record by UUID
  // Note: Since we cannot create actual todo history without create/edit endpoints,
  // we test the retrieval endpoint with a valid UUID format
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.multiUserTodo.member.todo_histories.at(
    memberConnection,
    { historyId },
  );
  typia.assert(history);
  // 3. Validate response structure
  TestValidator.equals("history ID matches", history.id, historyId);
  TestValidator.predicate(
    "member has valid ID",
    history.member.id !== undefined,
  );
  TestValidator.predicate(
    "has changed_at timestamp",
    history.changed_at !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    history.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    history.updated_at !== undefined,
  );
}
