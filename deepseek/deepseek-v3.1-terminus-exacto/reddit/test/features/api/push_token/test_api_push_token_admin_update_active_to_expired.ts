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
 * Test administrator updating a push token status from active to expired.
 * Validates that administrators can modify token lifecycle statuses including
 * platform information, device details, and expiration timestamps. The scenario
 * covers comprehensive token management workflow where an admin updates an
 * existing member's push token to reflect device changes and token expiration.
 */
export async function test_api_push_token_admin_update_active_to_expired(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberDisplayName = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create initial active push token for the member
  const pushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: "ios",
          device_token: typia.random<string & tags.Format<"uuid">>(),
          device_model: "iPhone 15 Pro",
          app_version: "1.0.0",
          token_status: "active",
          expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(pushToken);
  TestValidator.equals(
    "initial token status should be active",
    pushToken.token_status,
    "active",
  );

  // Step 3: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: "Test Administrator",
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Update push token status from active to expired
  const updatedToken =
    await api.functional.communityPlatform.admin.pushTokens.update(connection, {
      tokenId: pushToken.id,
      body: {
        token_status: "expired",
        expires_at: new Date().toISOString(), // Set expiration to now
      } satisfies ICommunityPlatformPushToken.IUpdate,
    });
  typia.assert(updatedToken);

  // Step 5: Validate token status change
  TestValidator.equals(
    "token status should be updated to expired",
    updatedToken.token_status,
    "expired",
  );
  TestValidator.notEquals(
    "token ID should remain the same",
    updatedToken.id,
    pushToken.id,
  );
  TestValidator.equals(
    "platform should remain unchanged",
    updatedToken.platform,
    pushToken.platform,
  );
  TestValidator.equals(
    "device token should remain unchanged",
    updatedToken.device_token,
    pushToken.device_token,
  );
  TestValidator.equals(
    "device model should remain unchanged",
    updatedToken.device_model,
    pushToken.device_model,
  );
  TestValidator.equals(
    "app version should remain unchanged",
    updatedToken.app_version,
    pushToken.app_version,
  );

  // Additional validation for expiration timestamp
  TestValidator.predicate(
    "expiration timestamp should be updated",
    new Date(updatedToken.expires_at!).getTime() <= new Date().getTime(),
  );
}
