import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import type { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_edit_history_entry } from "../../../prepare/prepare_random_multi_user_todo_edit_history_entry";

export async function test_api_todo_creation_title_only_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  const memberTodoConnection: api.IConnection = { host: connection.host };
  memberTodoConnection.headers = {
    ...(memberTodoConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const title = RandomGenerator.name();
  const created = await generate_random_multi_user_todo_member_todos_create(
    memberTodoConnection,
    {
      body: {
        title,
      },
    },
  );
  typia.assert(created);
  TestValidator.predicate("deletedAt is null", created.deletedAt === null);
  TestValidator.predicate("id is non-empty", created.id.length > 0);
  TestValidator.predicate(
    "createdAt/updatedAt/editedAt are non-empty",
    created.createdAt.length > 0 &&
      created.updatedAt.length > 0 &&
      created.editedAt.length > 0,
  );
}
