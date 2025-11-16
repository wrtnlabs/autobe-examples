import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

/**
 * Test the scenario where an admin attempts to retrieve a guest record using a
 * malformed or non-existent guestId.
 *
 * This test verifies proper validation and error handling for invalid guest
 * identifiers:
 *
 * 1. Test with non-UUID string (malformed format)
 * 2. Test with empty string
 * 3. Test with valid UUID format but non-existent guest
 * 4. Ensure all cases return 404 Not Found error (not 500 or other status)
 *
 * The test confirms system prevents enumeration attacks and doesn't leak
 * information about guest existence.
 *
 * Note: The test assumes the provided connection is already authenticated as
 * admin, as no authentication API endpoints are provided in the materials to
 * establish admin context. This is standard practice in E2E testing where the
 * test environment provides pre-configured authenticated connections.
 */
export async function test_api_admin_guest_detail_invalid_guestid(
  connection: api.IConnection,
) {
  // Test case 1: Non-UUID string (malformed format)
  await TestValidator.error(
    "non-UUID string should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.admin.guests.at(connection, {
        guestId: "not-a-uuid",
      });
    },
  );

  // Test case 2: Empty string
  await TestValidator.error(
    "empty string guestId should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.admin.guests.at(connection, {
        guestId: "",
      });
    },
  );

  // Test case 3: Valid UUID format but non-existent guest
  await TestValidator.error(
    "valid UUID format but non-existent guest should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.admin.guests.at(connection, {
        guestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
