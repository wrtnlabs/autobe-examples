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

/**
 * Test guest session creation when the HTTP referrer header is absent.
 *
 * Verifies that the guest creation endpoint accepts an empty referrer string and returns a valid guest record with identifier and timestamps. This covers the edge case where a visitor navigates directly to the application without a referrer header.
 *
 * 1. Send a POST request to /todoApp/guests with a valid href and an empty string for referrer.
 * 2. Validate the response is a valid guest record.
 */
export async function test_api_guest_session_creation_with_empty_referrer(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session with empty referrer (simulating direct navigation)
  const guest: ITodoAppGuest = await api.functional.todoApp.guests.create(
    connection,
    {
      body: {
        href: "https://example.com/landing",
        referrer: "",
      } satisfies ITodoAppGuest.ICreate,
    },
  );
  // Validate the full response structure (id, created_at, updated_at formats)
  typia.assert(guest);
}
