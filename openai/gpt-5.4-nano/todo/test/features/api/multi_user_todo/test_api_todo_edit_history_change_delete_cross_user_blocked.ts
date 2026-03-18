import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_edit_history_change_delete_cross_user_blocked(
  connection: api.IConnection,
): Promise<void> {
  const actorAConnection: api.IConnection = { host: connection.host };
  const actorBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(actorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(actorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberB);
  // TODO create todo + edit history + changes list.
  // The template set does not provide these SDK functions/DTOs in the prompt,
  // so we must rely on existing available APIs to fetch required IDs.
  // In absence of them, fail fast with a clear validator.
  await TestValidator.error(
    "todo edit-history change workflow is unavailable in provided SDK snapshot",
    () => {
      throw new Error(
        "Missing required SDK functions/DTOs to create todo/edit history/changes for member B.",
      );
    },
  );
  void actorAConnection;
  void actorBConnection;
}
