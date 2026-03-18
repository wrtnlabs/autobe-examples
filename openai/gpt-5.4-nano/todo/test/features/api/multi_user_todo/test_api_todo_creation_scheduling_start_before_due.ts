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

export async function test_api_todo_creation_scheduling_start_before_due(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join for auth tokens
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Create todo edit-history entry
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  const startDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const title = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const entry: IMultiUserTodoEditHistoryEntry =
    await generate_random_multi_user_todo_member_todos_create(userConnection, {
      body: {
        title,
        description,
        startDate: startDate satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
        dueDate: dueDate satisfies
          | (string & tags.Format<"date-time">)
          | null
          | undefined,
      } satisfies IMultiUserTodoEditHistoryEntry.ICreate,
    });
  typia.assert(entry);
  // 3) Validate timestamps and deletion state
  TestValidator.predicate(
    "editedAt is a non-empty string",
    () => entry.editedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt is a non-empty string",
    () => entry.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is a non-empty string",
    () => entry.updatedAt.length > 0,
  );
  TestValidator.equals("deletedAt is null", entry.deletedAt, null);
  // 4) Validate change records exist and follow DTO typing (all-null fields)
  TestValidator.predicate("has at least one change", entry.changes.length > 0);
  for (const change of entry.changes) {
    TestValidator.equals("change id is null", change.id, null);
    TestValidator.equals(
      "change changedField is null",
      change.changedField,
      null,
    );
    TestValidator.equals("change fromValue is null", change.fromValue, null);
    TestValidator.equals("change toValue is null", change.toValue, null);
    TestValidator.equals("change createdAt is null", change.createdAt, null);
    TestValidator.equals("change updatedAt is null", change.updatedAt, null);
    TestValidator.equals("change deletedAt is null", change.deletedAt, null);
  }
}
