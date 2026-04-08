import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_update_own_partial_edit_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Update a private member todo with a partial payload and verify the returned
   * todo reflects the editable fields while preserving the rest of the record.
   *
   * This test covers the authenticated member update endpoint using an isolated
   * member connection created through the join utility. It validates that the
   * update response is a full todo payload and that partial updates are accepted
   * for the mutable fields exposed by the DTO.
   *
   * 1. Register a new member and keep the authenticated connection isolated.
   * 2. Submit a partial todo update changing the title and one schedule field.
   * 3. Validate the response shape and ensure the updated values are returned.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const todoId = typia.random<string & tags.Format<"uuid">>();
  const title = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const response = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId,
      body: {
        title,
        startDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(response);
  TestValidator.equals("todo id should be returned", response.id, todoId);
  TestValidator.equals(
    "title should reflect the partial update",
    response.title,
    title,
  );
  TestValidator.equals(
    "start date should reflect the partial update",
    response.startDate,
    startDate,
  );
  TestValidator.predicate(
    "description field should exist",
    response.description !== undefined,
  );
  TestValidator.predicate(
    "due date field should exist",
    response.dueDate !== undefined,
  );
  TestValidator.predicate(
    "completion state field should exist",
    typeof response.isCompleted === "boolean",
  );
  TestValidator.predicate(
    "member field should exist",
    response.member !== undefined,
  );
  TestValidator.predicate(
    "createdAt field should exist",
    typeof response.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt field should exist",
    typeof response.updatedAt === "string",
  );
  TestValidator.predicate(
    "deletedAt field should exist",
    response.deletedAt !== undefined,
  );
  TestValidator.predicate(
    "edit history field should exist",
    response.todoEditHistories !== undefined,
  );
}
