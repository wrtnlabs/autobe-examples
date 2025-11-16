import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that logout-all endpoint requires proper authentication.
 *
 * This test validates that the logout-all endpoint cannot be accessed without
 * valid authentication credentials. It attempts to call the endpoint with an
 * unauthenticated connection and verifies that an authentication error is
 * thrown, confirming that the API properly enforces authentication requirements
 * for this sensitive operation that terminates all user sessions.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection by clearing authorization headers
 * 2. Attempt to call logout-all without authentication
 * 3. Validate that an authentication error is thrown
 * 4. Confirm proper security enforcement
 */
export async function test_api_member_logout_all_without_authentication(
  connection: api.IConnection,
) {
  // Create unauthenticated connection by removing authorization headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt to call logout-all without authentication - should fail
  await TestValidator.error(
    "logout-all should fail without authentication",
    async () => {
      await api.functional.communityPlatform.member.auth.member.sessions.logout_all.logoutAll(
        unauthConn,
      );
    },
  );
}
