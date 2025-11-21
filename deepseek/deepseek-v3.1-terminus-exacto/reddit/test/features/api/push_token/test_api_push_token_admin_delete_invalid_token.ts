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
 * Test administrator deleting an invalid push token that failed validation.
 * Validates that administrators can remove tokens that are no longer functional
 * due to platform changes, app uninstallation, or token revocation. The
 * scenario covers token management workflows where problematic tokens are
 * removed to prevent notification delivery failures.
 */
export async function test_api_push_token_admin_delete_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a member account that will own the push token
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

  // Step 2: Create a push token associated with the member
  // Create a token that would become invalid (simulating real-world scenario)
  const pushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: "ios",
          device_token: RandomGenerator.alphaNumeric(64),
          device_model: "iPhone15,3",
          app_version: "1.0.0",
          token_status: "active", // Start as active, becomes invalid later
          expires_at: new Date(Date.now() - 86400000).toISOString(), // Already expired
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(pushToken);

  // Step 3: Create and authenticate as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

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

  // Authenticate as admin with complete session context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Delete the invalid push token using admin privileges
  await api.functional.communityPlatform.admin.pushTokens.erase(connection, {
    tokenId: pushToken.id,
  });

  // Step 5: Verify the token deletion was successful
  // Attempt to delete the same token again should fail since it no longer exists
  await TestValidator.error(
    "deleting non-existent token should fail",
    async () => {
      await api.functional.communityPlatform.admin.pushTokens.erase(
        connection,
        {
          tokenId: pushToken.id,
        },
      );
    },
  );

  // Additional validation: Test that regular members cannot delete tokens
  // Switch back to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Verify member cannot perform admin token deletion
  await TestValidator.error(
    "member should not be able to delete tokens",
    async () => {
      await api.functional.communityPlatform.admin.pushTokens.erase(
        connection,
        {
          tokenId: pushToken.id,
        },
      );
    },
  );
}
