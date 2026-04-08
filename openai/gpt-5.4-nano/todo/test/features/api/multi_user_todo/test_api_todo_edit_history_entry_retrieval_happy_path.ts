import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_edit_history_entry_retrieval_happy_path(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a single multi-user todo edit history entry for an authenticated member.
   *
   * Validates that the member-scoped endpoint returns an immutable audit record whose
   * ownership context matches the authenticated member profile.
   */
  // 1. Join as a member.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  // In the provided SDK surface for this task, the only concrete workflow endpoint available
  // for edit history is the retrieval endpoint itself.
  const editHistoryEntry =
    await api.functional.multiUserTodo.member.todos.edit_history_entries.at(
      memberConnection,
      {
        todoId: typia.random<string & tags.Format<"uuid">>(),
        todoEditHistoryEntryId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(editHistoryEntry);
  // Validate ownership linkage context.
  TestValidator.equals(
    "ownerId matches authenticated member id",
    editHistoryEntry.ownerId,
    authorized.multi_user_todo_user_id,
  );
}
