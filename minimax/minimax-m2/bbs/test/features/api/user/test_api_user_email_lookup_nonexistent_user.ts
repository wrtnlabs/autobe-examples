import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Validate user email lookup for non-existent email addresses.
 *
 * This test validates the system's ability to handle lookup requests for users
 * that don't exist in the database. It creates a system administrator account
 * for proper authentication, then attempts to lookup a user with a non-existent
 * email address to verify that the API returns appropriate error responses.
 *
 * This is a critical negative test case that ensures the system gracefully
 * handles missing user scenarios with proper HTTP status codes and error
 * messaging, maintaining system stability and providing clear feedback for
 * invalid lookup attempts.
 */
export async function test_api_user_email_lookup_nonexistent_user(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Generate non-existent email for lookup test
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Step 3: Test lookup of non-existent user with proper authorization
  await TestValidator.error(
    "lookup of non-existent user should fail",
    async () => {
      return await api.functional.users.email.at(connection, {
        email: nonExistentEmail,
      });
    },
  );
}
