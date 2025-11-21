import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator retrieval of non-existent member information.
 *
 * This E2E test validates proper error handling when an administrator attempts
 * to retrieve member details using an invalid or non-existent UUID. The test
 * ensures that the API correctly rejects requests for non-existent member
 * records and provides appropriate error responses.
 */
export async function test_api_admin_member_detail_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin123!@#",
      display_name: RandomGenerator.name(),
      admin_level: "administrator",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a random UUID that does not exist in the system
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve non-existent member details and validate error
  await TestValidator.error(
    "should reject non-existent member ID",
    async () => {
      await api.functional.communityPlatform.admin.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
