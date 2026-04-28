import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving soft-deleted guest account details where the guest account has been transitioned or removed.
 *
 * Validates the complete guest retrieval workflow including verification that soft-deleted records remain queryable for audit trail purposes. The test scenarios covers guest account lifecycle management where records are logically deleted but physically retained.
 *
 * 1. Generate a valid guest UUID for retrieval
 * 2. Retrieve guest details using the guests.at endpoint
 * 3. Assert response structure using typia.assert
 * 4. Validate deleted_at contains a valid timestamp indicating soft deletion
 * 5. Verify all other fields (device_fingerprint, created_at, updated_at) are preserved
 */
export async function test_api_guest_retrieve_soft_deleted(
  connection: api.IConnection,
) {
  // Generate a guest UUID for soft-deleted guest retrieval
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the soft-deleted guest
  const guest = await api.functional.ecommercePlatform.guests.at(connection, {
    guestId,
  });
  typia.assert<IEcommercePlatformGuest>(guest);
  // Validate that all required fields are present and match expected values
  TestValidator.equals("guest id matches request", guest.id, guestId);
  TestValidator.predicate(
    "has device_fingerprint",
    guest.device_fingerprint.length > 0,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    guest.updated_at.length > 0,
  );
  // Validate deleted_at is non-null (indicating soft-deleted status)
  TestValidator.predicate(
    "deleted_at is non-null for soft-deleted guest",
    guest.deleted_at !== null,
  );
  // If deleted_at is present, validate it contains a valid timestamp format
  if (guest.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at contains valid timestamp",
      guest.deleted_at.length > 0,
    );
  }
}
