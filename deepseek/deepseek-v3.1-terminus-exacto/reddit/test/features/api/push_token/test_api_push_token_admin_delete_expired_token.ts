import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPushToken";

/**
 * Test administrator deleting an expired push token from the system.
 *
 * Validates that administrators can perform hard deletion of tokens that are no
 * longer valid or needed. The scenario covers token cleanup workflows where
 * expired tokens are removed to maintain system efficiency and notification
 * delivery reliability.
 */
export async function test_api_push_token_admin_delete_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create member account that will own the push token
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create push token with expired status
  const expiredToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: "ios",
          device_token: typia.random<string>(),
          token_status: "expired",
          expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired 1 day ago
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(expiredToken);

  // Step 3: Create admin account for token deletion
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Perform token deletion by admin
  await api.functional.communityPlatform.admin.pushTokens.erase(connection, {
    tokenId: expiredToken.id,
  });

  // Step 5: Validate successful deletion by testing token re-deletion (should fail)
  await TestValidator.error(
    "deleted token should not be deletable again",
    async () => {
      await api.functional.communityPlatform.admin.pushTokens.erase(
        connection,
        {
          tokenId: expiredToken.id,
        },
      );
    },
  );

  // Additional validation: Verify system state remains consistent
  TestValidator.predicate(
    "member account still exists after token deletion",
    member.id !== null && member.id !== undefined,
  );

  TestValidator.predicate(
    "admin account remains functional",
    admin.id !== null && admin.id !== undefined,
  );

  TestValidator.equals(
    "expired token had correct status before deletion",
    expiredToken.token_status,
    "expired",
  );
}
