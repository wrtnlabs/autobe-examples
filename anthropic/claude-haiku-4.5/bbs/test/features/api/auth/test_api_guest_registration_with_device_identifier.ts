import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest user registration with device identifier for session tracking.
 *
 * This test validates the guest registration endpoint's ability to accept and
 * store device identifiers for session correlation and analytics purposes.
 * Guest users can register with an optional device identifier (browser
 * fingerprint, device UUID, or any string) which is used to associate multiple
 * requests with the same device for tracking and analytics.
 *
 * Test scenarios:
 *
 * 1. Register guest with a specific device identifier (e.g., browser fingerprint)
 * 2. Verify device_identifier is returned in the response
 * 3. Register guest without device identifier (optional field)
 * 4. Validate JWT tokens are generated for both cases
 * 5. Confirm response includes guest id, device_identifier, created_at, and token
 */
export async function test_api_guest_registration_with_device_identifier(
  connection: api.IConnection,
) {
  // Test Case 1: Register guest with a device identifier
  const deviceIdentifier1 = RandomGenerator.alphaNumeric(32);

  const guest1 = await api.functional.auth.guest.join(connection, {
    body: {
      device_identifier: deviceIdentifier1,
    } satisfies IDiscussionBoardGuest.ICreate,
  });

  typia.assert(guest1);
  TestValidator.equals(
    "device_identifier should be stored in guest profile",
    guest1.device_identifier,
    deviceIdentifier1,
  );

  // Test Case 2: Register guest without device identifier
  const guest2 = await api.functional.auth.guest.join(connection, {
    body: {} satisfies IDiscussionBoardGuest.ICreate,
  });

  typia.assert(guest2);
  TestValidator.predicate(
    "guest2 should be registered successfully",
    guest2.id !== null && guest2.id !== undefined,
  );
  TestValidator.notEquals(
    "guest2 should have different id from guest1",
    guest2.id,
    guest1.id,
  );

  // Test Case 3: Register guest with another device identifier format (UUID)
  const deviceIdentifier3 = typia.random<string & tags.Format<"uuid">>();

  const guest3 = await api.functional.auth.guest.join(connection, {
    body: {
      device_identifier: deviceIdentifier3,
    } satisfies IDiscussionBoardGuest.ICreate,
  });

  typia.assert(guest3);
  TestValidator.equals(
    "device_identifier with uuid format should be stored",
    guest3.device_identifier,
    deviceIdentifier3,
  );

  // Test Case 4: Register guest with null device identifier
  const guest4 = await api.functional.auth.guest.join(connection, {
    body: {
      device_identifier: null,
    } satisfies IDiscussionBoardGuest.ICreate,
  });

  typia.assert(guest4);
  TestValidator.equals(
    "guest4 with null device_identifier should be accepted",
    guest4.device_identifier,
    null,
  );

  // Test Case 5: Verify multiple device identifiers are independent sessions
  TestValidator.notEquals(
    "guest with different device identifiers should have different ids",
    guest1.id,
    guest3.id,
  );

  // Test Case 6: Verify device identifier persistence across registrations
  TestValidator.predicate(
    "each guest registration should have unique id",
    guest1.id !== guest2.id &&
      guest2.id !== guest3.id &&
      guest3.id !== guest4.id,
  );
}
