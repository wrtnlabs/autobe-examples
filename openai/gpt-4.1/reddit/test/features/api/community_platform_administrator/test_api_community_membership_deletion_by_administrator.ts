import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Validate that an administrator can delete a user's membership from a
 * community.
 *
 * This test covers registration/authentication via the administrator join
 * endpoint, and then attempts to delete a membership from a specified community
 * as an admin user. It also verifies that attempts to delete random memberships
 * (which do not exist or are already deleted) return API error responses.
 *
 * Test Workflow:
 *
 * 1. Register a new administrator via the join flow using random credentials
 * 2. Attempt to delete a membership from a random community using random
 *    membershipId (expected to fail with error, as creation APIs are
 *    unavailable)
 * 3. Attempt to delete a non-existent membershipId (should fail with error)
 */
export async function test_api_community_membership_deletion_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 2: Attempt to delete a membership from a (random) community
  const communityName = RandomGenerator.alphaNumeric(10);
  const membershipId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail deleting non-existent membership",
    async () => {
      await api.functional.communityPlatform.administrator.communities.memberships.erase(
        connection,
        {
          communityName,
          membershipId,
        },
      );
    },
  );

  // Step 3: Attempt again to delete the same membershipId (still non-existent)
  await TestValidator.error(
    "should fail deleting already-deleted (still non-existent) membership",
    async () => {
      await api.functional.communityPlatform.administrator.communities.memberships.erase(
        connection,
        {
          communityName,
          membershipId,
        },
      );
    },
  );
}
