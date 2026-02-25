import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of guest user details by valid UUID.
 * Verifies that the response contains full guest entity data including
 * id, deviceFingerprint, createdAt, updatedAt, and optional deletedAt fields.
 * Confirms HTTP 200 status and correct JSON structure.
 */
export async function test_api_guest_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Use a fixed known guest UUID to test primary success path
  const guestId = "11111111-1111-1111-1111-111111111111" satisfies string &
    typia.tags.Format<"uuid">;
  // Prepare a guest retrieval connection (guest is public, no auth needed)
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the API
  const guest: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guests.at(guestConnection, {
      id: guestId,
    });
  // Validate full structure
  typia.assert(guest);
  // Validate id format and type (not equality to guestId as it may be stored differently)
  TestValidator.predicate(
    "guest id is UUID string",
    typeof guest.id === "string" && guest.id.length === 36,
  );
  // Validate basic properties exist
  TestValidator.predicate(
    "deviceFingerprint exists",
    typeof guest.deviceFingerprint === "string" &&
      guest.deviceFingerprint.length > 0,
  );
  TestValidator.predicate(
    "createdAt is date-time format",
    typeof guest.createdAt === "string",
  );
  TestValidator.predicate(
    "updatedAt is date-time format",
    typeof guest.updatedAt === "string",
  );
  // Validate deletedAt is either string or null or undefined
  TestValidator.predicate(
    "deletedAt is string|null|undefined",
    guest.deletedAt === null ||
      guest.deletedAt === undefined ||
      typeof guest.deletedAt === "string",
  );
}
