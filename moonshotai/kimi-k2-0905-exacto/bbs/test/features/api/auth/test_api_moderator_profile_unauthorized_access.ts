import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";

/**
 * Test that moderator profile retrieval fails when accessed without
 * authentication.
 *
 * This test validates that the moderator profile endpoint properly enforces
 * access control by rejecting requests from unauthenticated users. The endpoint
 * should throw an error when called without valid authentication credentials,
 * ensuring that moderator account details remain secure and cannot be accessed
 * by unauthorized parties.
 *
 * The test demonstrates proper security implementation where:
 *
 * 1. Unauthenticated requests to moderator endpoints are rejected
 * 2. Appropriate error responses are returned for unauthorized access
 * 3. Public users cannot obtain moderator profile information
 *
 * This is crucial for maintaining the security of administrative accounts and
 * preventing information disclosure to unauthorized users.
 */
export async function test_api_moderator_profile_unauthorized_access(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by clearing any existing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Test that accessing moderator profile without authentication throws an error
  await TestValidator.error(
    "unauthenticated moderator profile access should fail",
    async () => {
      await api.functional.auth.moderator.me.at(unauthConnection);
    },
  );
}
