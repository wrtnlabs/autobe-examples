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
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test private todo creation success for an authenticated member.
 *
 * Verifies that a newly joined private member can create a todo with the required title and all optional fields, and that the created response preserves the submitted business data while automatically assigning ownership, identifiers, timestamps, and default incomplete status.
 *
 * This scenario also confirms that the authenticated member session is used for ownership resolution rather than the base connection, and that the returned owner relation is present in the created todo payload.
 *
 * 1. Register a new private member and obtain an authenticated session.
 * 2. Create a todo with title, description, start date, and due date using the authenticated member connection.
 * 3. Validate the returned todo contents, timestamps, default completion state, and owner linkage.
 */
export async function test_api_todo_creation_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const title = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const created = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
        description,
        startDate,
        dueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals("created todo title", created.title, title);
  TestValidator.equals(
    "created todo description",
    created.description,
    description,
  );
  TestValidator.equals("created todo start date", created.startDate, startDate);
  TestValidator.equals("created todo due date", created.dueDate, dueDate);
  TestValidator.predicate("created todo has id", created.id.length > 0);
  TestValidator.predicate(
    "created todo createdAt assigned",
    created.createdAt.length > 0,
  );
  TestValidator.predicate(
    "created todo updatedAt assigned",
    created.updatedAt.length > 0,
  );
  TestValidator.equals(
    "created todo incomplete by default",
    created.isCompleted,
    false,
  );
  TestValidator.equals(
    "created todo deletedAt is null",
    created.deletedAt,
    null,
  );
  TestValidator.predicate(
    "created todo owner relation exists",
    created.member !== null && created.member !== undefined,
  );
}
