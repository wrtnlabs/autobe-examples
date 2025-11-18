import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify partial updating of todo fields with omission and nullable handling.
 *
 * This test checks that updating a todo allows omitting any mutable field
 * (title/description/status), leaving others unchanged, and allows setting
 * nullable fields (description) to null. Attempts to include immutable fields
 * are not possible due to DTO constraints and are thus omitted, but
 * immutability is checked by inspecting responses. Steps:
 *
 * 1. Register a new user (auth/join)
 * 2. Create a sample todo
 * 3. For each mutable field, update only that field; verify only that property
 *    changes
 * 4. Update two fields, verify correct results
 * 5. Update with no body (all omitted), todo remains unchanged
 * 6. Set description to explicit null, ensure response sets description to null
 * 7. After each update, assert system fields (id, created_at, deleted_at) remain
 *    constant
 */
export async function test_api_todo_update_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register a new user and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "A1";
  const joinResp: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        display_name: RandomGenerator.name(2),
        ip: undefined,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      },
    });
  typia.assert(joinResp);
  // 2. Create a todo
  const initial = await api.functional.todoList.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 8 }),
    },
  });
  typia.assert(initial);
  // Store baseline for assertions
  const original = { ...initial };
  // 3a. Update only the title
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTitle = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: { title: newTitle },
    },
  );
  typia.assert(updatedTitle);
  TestValidator.equals("title updated", updatedTitle.title, newTitle);
  TestValidator.equals(
    "description unchanged with single field update",
    updatedTitle.description,
    original.description,
  );
  TestValidator.equals(
    "status unchanged with single field update",
    updatedTitle.status,
    original.status,
  );
  TestValidator.equals(
    "id is stable after partial update",
    updatedTitle.id,
    original.id,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updatedTitle.updated_at,
    original.updated_at,
  );
  // 3b. Update only the status
  const newStatus = updatedTitle.status === "pending" ? "completed" : "pending";
  const updatedStatus = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: { status: newStatus },
    },
  );
  typia.assert(updatedStatus);
  TestValidator.equals("status updated", updatedStatus.status, newStatus);
  TestValidator.equals(
    "title unchanged with status update",
    updatedStatus.title,
    updatedTitle.title,
  );
  TestValidator.equals(
    "description unchanged with status update",
    updatedStatus.description,
    updatedTitle.description,
  );
  TestValidator.equals(
    "id is stable after status update",
    updatedStatus.id,
    updatedTitle.id,
  );
  // 3c. Update only the description
  const newDesc = RandomGenerator.paragraph({ sentences: 5 });
  const updatedDesc = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: { description: newDesc },
    },
  );
  typia.assert(updatedDesc);
  TestValidator.equals("description updated", updatedDesc.description, newDesc);
  TestValidator.equals(
    "title unchanged with description update",
    updatedDesc.title,
    updatedStatus.title,
  );
  TestValidator.equals(
    "status unchanged with description update",
    updatedDesc.status,
    updatedStatus.status,
  );
  TestValidator.equals(
    "id is stable after description update",
    updatedDesc.id,
    updatedStatus.id,
  );
  // 4. Update multiple fields (title and status)
  const compoundTitle = RandomGenerator.paragraph({ sentences: 2 });
  const compoundStatus =
    updatedDesc.status === "pending" ? "completed" : "pending";
  const updatedCompound = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: { title: compoundTitle, status: compoundStatus },
    },
  );
  typia.assert(updatedCompound);
  TestValidator.equals(
    "compound title update",
    updatedCompound.title,
    compoundTitle,
  );
  TestValidator.equals(
    "compound status update",
    updatedCompound.status,
    compoundStatus,
  );
  TestValidator.equals(
    "compound description stays",
    updatedCompound.description,
    updatedDesc.description,
  );
  // 5. Update (omit all fields - send empty body)
  const unchanged = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: {},
    },
  );
  typia.assert(unchanged);
  TestValidator.equals(
    "update with empty body leaves todo unchanged",
    unchanged.title,
    updatedCompound.title,
  );
  TestValidator.equals(
    "update with empty body leaves status unchanged",
    unchanged.status,
    updatedCompound.status,
  );
  TestValidator.equals(
    "update with empty body leaves description unchanged",
    unchanged.description,
    updatedCompound.description,
  );
  // 6. Set description explicitly to null
  const descNullified = await api.functional.todoList.user.todos.update(
    connection,
    {
      todoId: initial.id,
      body: { description: null },
    },
  );
  typia.assert(descNullified);
  TestValidator.equals(
    "description can be nullified",
    descNullified.description,
    null,
  );
  // Final immutability checks for id and created_at
  TestValidator.equals(
    "id immutable after all updates",
    descNullified.id,
    original.id,
  );
  TestValidator.equals(
    "created_at immutable after all updates",
    descNullified.created_at,
    original.created_at,
  );
}
