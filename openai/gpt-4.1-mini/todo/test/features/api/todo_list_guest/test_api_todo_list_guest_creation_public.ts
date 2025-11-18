import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_todo_list_guest_creation_public(
  connection: api.IConnection,
) {
  // Generate a realistic IPv4 address string
  const visitorIp = `${RandomGenerator.pick([..."0123456789"])}${RandomGenerator.pick([..."0123456789"])}.${RandomGenerator.pick([..."0123456789"])}${RandomGenerator.pick([..."0123456789"])}.${RandomGenerator.pick([..."0123456789"])}${RandomGenerator.pick([..."0123456789"])}.${RandomGenerator.pick([..."0123456789"])}${RandomGenerator.pick([..."0123456789"])}`;

  // Create a new todo list guest using the API
  const guest: ITodoListGuest =
    await api.functional.todoList.todoListGuests.create(connection, {
      body: {
        visitor_ip: visitorIp,
      } satisfies ITodoListGuest.ICreate,
    });

  // Assert that the response matches the expected ITodoListGuest structure
  typia.assert(guest);

  // Verify that the visitor IP matches the input
  TestValidator.equals(
    "guest visitor_ip matches input",
    guest.visitor_ip,
    visitorIp,
  );

  // Verify ID is a valid UUID
  TestValidator.predicate(
    "guest id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );

  // Verify created_at and updated_at are valid ISO datetime strings
  TestValidator.predicate(
    "guest created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      guest.created_at,
    ),
  );

  TestValidator.predicate(
    "guest updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      guest.updated_at,
    ),
  );
}
