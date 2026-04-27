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

export async function test_api_guest_session_creation_with_both_empty_urls(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session with empty strings for both href and referrer
  const guest: ITodoAppGuest = await generate_random_todo_app_guests_create(
    connection,
    {
      body: {
        href: "",
        referrer: "",
      },
    },
  );
  typia.assert(guest);
}
