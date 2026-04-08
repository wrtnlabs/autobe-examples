import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random guest UUID for testing
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Call the guest retrieve endpoint
  const guest = await api.functional.multiUserTodo.guests.at(connection, {
    guestId,
  });
  // Validate complete guest response structure
  typia.assert<IMultiUserTodoGuest>(guest);
  // Validate id matches requested guestId
  TestValidator.equals("guest id matches requested", guest.id, guestId);
  // Validate fingerprint_hash is non-empty string
  TestValidator.predicate(
    "fingerprint_hash is non-empty",
    guest.fingerprint_hash.length > 0,
  );
  // Validate user_agent can be null/undefined (nullable field)
  if (guest.user_agent !== null && guest.user_agent !== undefined) {
    TestValidator.predicate(
      "user_agent is string when present",
      typeof guest.user_agent === "string",
    );
  }
  // Validate ip_address can be null/undefined (nullable field)
  if (guest.ip_address !== null && guest.ip_address !== undefined) {
    TestValidator.predicate(
      "ip_address is string when present",
      typeof guest.ip_address === "string",
    );
  }
  // Validate status is 'active'
  TestValidator.equals("guest status is active", guest.status, "active");
  // Validate created_at is valid datetime format
  typia.assert<string & tags.Format<"date-time">>(guest.created_at);
  // Validate updated_at is valid datetime format
  typia.assert<string & tags.Format<"date-time">>(guest.updated_at);
  // Validate deleted_at is null (not soft-deleted)
  typia.assert<(string & tags.Format<"date-time">) | null>(guest.deleted_at);
  TestValidator.equals("guest not soft-deleted", guest.deleted_at, null);
  // Validate sessions_count is valid int32 and non-negative
  typia.assert<number & tags.Type<"int32">>(guest.sessions_count);
  TestValidator.predicate(
    "sessions_count is non-negative",
    guest.sessions_count >= 0,
  );
}
