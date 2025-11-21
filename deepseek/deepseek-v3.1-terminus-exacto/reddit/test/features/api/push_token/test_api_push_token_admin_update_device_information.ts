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
 * Test administrator updating push token device information including model and
 * app version. Validates that administrators can modify device-specific details
 * for notification optimization and troubleshooting purposes. The scenario
 * covers device upgrade scenarios where token information needs to be updated
 * to reflect new hardware or software versions.
 */
export async function test_api_push_token_admin_update_device_information(
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

  // Step 2: Create an initial push token for the member
  const initialPushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: "ios",
          device_token: typia.random<string>(),
          device_model: "iPhone 13",
          app_version: "1.0.0",
          token_status: "active",
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(initialPushToken);

  // Step 3: Create and authenticate as admin
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

  // Step 4: Update the push token with new device information
  const updatedPushToken =
    await api.functional.communityPlatform.admin.pushTokens.update(connection, {
      tokenId: initialPushToken.id,
      body: {
        device_model: "iPhone 15 Pro",
        app_version: "2.5.1",
        token_status: "active",
      } satisfies ICommunityPlatformPushToken.IUpdate,
    });
  typia.assert(updatedPushToken);

  // Step 5: Verify the update was successful
  TestValidator.equals(
    "device model should be updated",
    updatedPushToken.device_model,
    "iPhone 15 Pro",
  );
  TestValidator.equals(
    "app version should be updated",
    updatedPushToken.app_version,
    "2.5.1",
  );
  TestValidator.equals(
    "token ID should remain the same",
    updatedPushToken.id,
    initialPushToken.id,
  );
  TestValidator.equals(
    "platform should remain unchanged",
    updatedPushToken.platform,
    initialPushToken.platform,
  );
  TestValidator.equals(
    "device token should remain unchanged",
    updatedPushToken.device_token,
    initialPushToken.device_token,
  );
}
