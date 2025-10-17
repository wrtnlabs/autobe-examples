import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest account creation without newsletter email to verify the minimal
 * registration path.
 *
 * This scenario validates that guests can create sessions with minimal
 * information for frictionless access. The test creates a guest session without
 * providing a newsletter email and verifies that JWT tokens are issued
 * successfully.
 *
 * Test steps:
 *
 * 1. Create guest session without providing newsletter email
 * 2. Validate that the response structure is correct
 */
export async function test_api_guest_registration_without_newsletter(
  connection: api.IConnection,
) {
  // Create guest session without newsletter email
  const guest = await api.functional.auth.guest.join(connection, {
    body: {} satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guest);
}
