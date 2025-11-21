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
 * Test successful push token registration by a member user.
 *
 * This test validates the complete workflow of push token registration:
 *
 * 1. Create a member account through authentication
 * 2. Register a push notification token with realistic device information
 * 3. Verify token storage with proper status, timestamps, and user association
 * 4. Validate that optional metadata (device model, app version) is handled
 *    correctly
 */
export async function test_api_push_token_member_registration(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Register push notification token with realistic device data
  const platform = RandomGenerator.pick(["ios", "android"] as const);
  const deviceToken = typia.random<string & tags.Format<"uuid">>();
  const deviceModel = RandomGenerator.pick([
    "iPhone 15 Pro",
    "Samsung Galaxy S24",
    "Google Pixel 8",
  ] as const);
  const appVersion =
    "1." +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<9>
    >() +
    "." +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>
    >();

  const pushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: platform,
          device_token: deviceToken,
          device_model: deviceModel,
          app_version: appVersion,
          token_status: "active",
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(pushToken);

  // Step 3: Validate token registration response
  TestValidator.equals(
    "token should have active status",
    pushToken.token_status,
    "active",
  );
  TestValidator.equals(
    "token should be associated with member",
    pushToken.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "platform should match input",
    pushToken.platform,
    platform,
  );
  TestValidator.equals(
    "device token should match input",
    pushToken.device_token,
    deviceToken,
  );
  TestValidator.equals(
    "device model should match input",
    pushToken.device_model,
    deviceModel,
  );
  TestValidator.equals(
    "app version should match input",
    pushToken.app_version,
    appVersion,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp should be valid ISO string",
    typeof pushToken.created_at === "string" &&
      pushToken.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid ISO string",
    typeof pushToken.updated_at === "string" &&
      pushToken.updated_at.includes("T"),
  );

  // Validate token has UUID format
  TestValidator.predicate(
    "device token should have UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      pushToken.device_token,
    ),
  );
}
