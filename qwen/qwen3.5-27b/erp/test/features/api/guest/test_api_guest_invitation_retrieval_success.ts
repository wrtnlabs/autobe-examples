import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a guest invitation record by unique identifier.
 *
 * Validates the GET /hrmTimeTrack/guests/{guestId} endpoint response structure and data integrity. Confirms that all required fields are present with correct types, including nested organization and role summary objects.
 *
 * This test verifies that the guest invitation retrieval endpoint returns properly structured data with valid UUIDs, email formats, datetime timestamps, and correctly typed nested objects. The test assumes the guest invitation exists in the system.
 *
 * 1. Generate a valid UUID for the guest invitation ID parameter.
 * 2. Call the GET /hrmTimeTrack/guests/{guestId} endpoint with the guest ID.
 * 3. Validate the complete response structure using typia.assert().
 * 4. Verify business logic: guest ID matches the requested ID.
 * 5. Confirm nested organization and role objects are present with expected structure.
 */
export async function test_api_guest_invitation_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for guest invitation ID
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the guest invitation by ID
  const guest: IHrmTimeTrackGuest = await api.functional.hrmTimeTrack.guests.at(
    connection,
    {
      guestId,
    },
  );
  // Validate complete response structure - typia.assert() performs complete type validation
  typia.assert(guest);
  // Verify guest ID matches the requested ID (business logic validation)
  TestValidator.equals("guest ID matches request", guest.id, guestId);
  // Verify organization object is present and has expected structure
  TestValidator.predicate(
    "organization exists",
    guest.organization !== null && guest.organization !== undefined,
  );
  TestValidator.equals(
    "organization has valid ID",
    typeof guest.organization.id,
    "string",
  );
  TestValidator.equals(
    "organization has valid name",
    typeof guest.organization.name,
    "string",
  );
  // Verify role object is present and has expected structure
  TestValidator.predicate(
    "role exists",
    guest.role !== null && guest.role !== undefined,
  );
  TestValidator.equals("role has valid ID", typeof guest.role.id, "string");
  TestValidator.equals("role has valid name", typeof guest.role.name, "string");
  TestValidator.equals(
    "role has is_builtin flag",
    typeof guest.role.is_builtin,
    "boolean",
  );
  // Verify status is one of expected business values
  TestValidator.predicate(
    "status is valid business value",
    guest.status === "pending" ||
      guest.status === "accepted" ||
      guest.status === "expired",
  );
}
