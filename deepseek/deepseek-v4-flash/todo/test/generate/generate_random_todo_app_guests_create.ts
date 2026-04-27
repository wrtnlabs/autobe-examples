import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_todo_app_guest } from "../prepare/prepare_random_todo_app_guest";

/**
 * Generate a random guest session via the API for E2E testing.
 *
 * Prepares random guest session initialization data using the prepare function,
 * then calls the guest creation endpoint to create an anonymous guest record
 * and session on the server. The generated session is time-limited and carries
 * no persistent user data.
 *
 * Both the {@link href} and {@link referrer} fields are populated with random
 * values by the prepare function, but can be overridden via the optional input
 * parameter for test scenarios requiring specific URL patterns.
 *
 * @param connection - The API connection configuration
 * @param props.body - Optional partial input to override default random values
 * @returns The created guest record with session token and expiration timestamp
 */
export async function generate_random_todo_app_guests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.ICreate> | undefined;
  },
): Promise<ITodoAppGuest> {
  const prepared: ITodoAppGuest.ICreate = prepare_random_todo_app_guest(
    props.body,
  );
  return await api.functional.todoApp.guests.create(connection, {
    body: prepared,
  });
}
