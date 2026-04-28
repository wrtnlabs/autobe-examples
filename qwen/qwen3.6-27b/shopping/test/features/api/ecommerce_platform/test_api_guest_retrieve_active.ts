import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving complete guest account details for an active unregistered visitor.
 *
 * Validates the primary success path for guest account retrieval without authentication. Verifies that the guest endpoint returns complete profile data including device fingerprint and lifecycle timestamps. Special attention is given to confirming that active guests have a null deleted_at field.
 *
 * 1. Generate a random UUID as the guest identifier.
 * 2. Retrieve guest details using the unauthenticated endpoint.
 * 3. Validate the complete response structure matches IEcommercePlatformGuest.
 * 4. Confirm the guest is active by asserting deleted_at is null.
 */
export async function test_api_guest_retrieve_active(
  connection: api.IConnection,
) {
  // Generate guest ID for retrieval (no auth required per endpoint spec)
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve guest details - endpoint has no authorization requirement
  const guest = await api.functional.ecommercePlatform.guests.at(connection, {
    guestId,
  });
  typia.assert(guest);
  // Validate response matches the requested ID
  TestValidator.equals("guest id matches request", guest.id, guestId);
  // Validate active guest: deleted_at must be null for non-deleted accounts
  TestValidator.equals(
    "active guest has null deleted_at",
    guest.deleted_at,
    null,
  );
}
