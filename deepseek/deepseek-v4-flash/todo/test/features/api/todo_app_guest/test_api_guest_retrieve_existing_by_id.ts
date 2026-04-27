import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_guests_create } from "../../../generate/generate_random_todo_app_guests_create";
import { prepare_random_todo_app_guest } from "../../../prepare/prepare_random_todo_app_guest";

export async function test_api_guest_retrieve_existing_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new anonymous guest session
  const created = await generate_random_todo_app_guests_create(connection, {});
  typia.assert(created);
  // 2. Retrieve the guest by its ID
  const retrieved = await api.functional.todoApp.guests.at(connection, {
    guestId: created.id,
  });
  typia.assert(retrieved);
  // 3. Validate the retrieved record matches the original
  TestValidator.equals("guest id", created.id, retrieved.id);
  TestValidator.equals(
    "guest created_at",
    created.created_at,
    retrieved.created_at,
  );
  TestValidator.equals(
    "guest updated_at",
    created.updated_at,
    retrieved.updated_at,
  );
}
