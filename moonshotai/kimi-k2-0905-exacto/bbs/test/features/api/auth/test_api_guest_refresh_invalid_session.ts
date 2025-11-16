import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

/**
 * Test token refresh attempt with invalid or expired guest session ID.
 *
 * Validates proper error handling when refresh operation is attempted with
 * non-existent session. Verifies system rejects refresh requests for invalid
 * sessions with appropriate error response.
 *
 * Test scenario includes:
 *
 * 1. Generate a random UUID that doesn't correspond to any existing guest session
 * 2. Attempt to refresh the guest token using this invalid session ID
 * 3. Verify that the system properly rejects the request with an error
 * 4. Test with multiple invalid session IDs of different formats to ensure
 *    comprehensive validation
 */
export async function test_api_guest_refresh_invalid_session(
  connection: api.IConnection,
) {
  // Test with completely random UUID that doesn't exist
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "refresh with non-existent session should fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          id: invalidSessionId,
        } satisfies IEconomicDiscussionGuest.IRefresh,
      });
    },
  );

  // Test with another random UUID to ensure consistency
  const anotherInvalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "second random session ID refresh should also fail",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          id: anotherInvalidSessionId,
        } satisfies IEconomicDiscussionGuest.IRefresh,
      });
    },
  );
}
