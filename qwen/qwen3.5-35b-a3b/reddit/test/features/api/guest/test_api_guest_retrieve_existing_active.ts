import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieve_existing_active(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid guest record using typia.random
  // This creates a guest with id (UUID), fingerprint (string),
  // created_at (ISO date-time), updated_at (ISO date-time), deleted_at (nullable)
  const guestData = typia.random<IRedditPlatformGuest>();
  typia.assert(guestData);
  // Ensure guest is active by setting deleted_at to null
  // This represents an active guest account not marked for cleanup
  guestData.deleted_at = null;
  // Retrieve the guest using the generated ID
  // This tests the primary success path for guest account retrieval
  const retrievedGuest = await api.functional.redditPlatform.guests.at(
    connection,
    {
      guestId: guestData.id,
    },
  );
  typia.assert(retrievedGuest);
  // Validate all response fields match the expected DTO structure
  TestValidator.equals("guest id matches", retrievedGuest.id, guestData.id);
  TestValidator.equals(
    "fingerprint matches",
    retrievedGuest.fingerprint,
    guestData.fingerprint,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedGuest.created_at,
    guestData.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedGuest.updated_at,
    guestData.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active guest",
    retrievedGuest.deleted_at,
    null,
  );
  // Validate fingerprint is a non-empty string (device hash)
  TestValidator.predicate(
    "fingerprint is non-empty string",
    retrievedGuest.fingerprint.length > 0,
  );
  // Validate deleted_at is null for active guest (soft delete not applied)
  TestValidator.predicate(
    "deleted_at is null for active guest",
    retrievedGuest.deleted_at === null,
  );
}
