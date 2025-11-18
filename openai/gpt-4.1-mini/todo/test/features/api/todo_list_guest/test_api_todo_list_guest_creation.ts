import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_todo_list_guest_creation(
  connection: api.IConnection,
) {
  // Generate a realistic IP address for the guest
  const visitorIp = `${RandomGenerator.pick(["192", "10", "172"])}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.$
{typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.$
{typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`;

  // Create the guest by calling the API with the required visitor IP
  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: {
        visitor_ip: visitorIp,
      } satisfies ITodoListGuest.ICreate,
    });

  // Assert the API response conforms exactly to ITodoListGuest
  typia.assert(guest);

  // Assert the guest.id is a valid UUID string
  TestValidator.predicate(
    "guest.id is a valid UUID",
    typeof guest.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
  );

  // Assert the visitor_ip matches the sent IP
  TestValidator.equals("visitor_ip matches input", guest.visitor_ip, visitorIp);

  // Assert the timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    typeof guest.created_at === "string" &&
      !isNaN(Date.parse(guest.created_at)),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    typeof guest.updated_at === "string" &&
      !isNaN(Date.parse(guest.updated_at)),
  );
}
