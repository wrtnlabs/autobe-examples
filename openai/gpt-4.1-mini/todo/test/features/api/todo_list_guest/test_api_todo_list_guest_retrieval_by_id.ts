import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_todo_list_guest_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new Todo List guest
  const visitorIp: string = RandomGenerator.mobile();
  const createdGuest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: { visitor_ip: visitorIp } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(createdGuest);

  // 2. Retrieve the guest by ID
  const retrievedGuest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.at(connection, {
      id: createdGuest.id,
    });
  typia.assert(retrievedGuest);

  // 3. Validate the data consistency
  TestValidator.equals("guest id matches", retrievedGuest.id, createdGuest.id);
  TestValidator.equals(
    "guest visitor_ip matches",
    retrievedGuest.visitor_ip,
    createdGuest.visitor_ip,
  );
  TestValidator.equals(
    "guest created_at matches",
    retrievedGuest.created_at,
    createdGuest.created_at,
  );
  TestValidator.equals(
    "guest updated_at matches",
    retrievedGuest.updated_at,
    createdGuest.updated_at,
  );
}
