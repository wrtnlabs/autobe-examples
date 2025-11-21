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
 * Test push token registration with comprehensive device metadata including
 * device model, app version, and optional expiration settings. This scenario
 * validates that all optional fields are properly handled during token
 * registration, including device-specific information that enables optimized
 * notification delivery and troubleshooting capabilities.
 */
export async function test_api_push_token_registration_with_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "Password123",
      display_name: RandomGenerator.name(),
      ip: "192.168.1.100",
      href: "https://community.example.com/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Register push token with comprehensive metadata
  const pushTokenData = {
    platform: "ios",
    device_token: typia.random<string & tags.Format<"uuid">>(),
    device_model: RandomGenerator.paragraph({ sentences: 2 }),
    app_version:
      RandomGenerator.alphabets(5) +
      "." +
      RandomGenerator.alphabets(1) +
      "." +
      RandomGenerator.alphabets(1),
    token_status: "active",
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  } satisfies ICommunityPlatformPushToken.ICreate;

  const registeredToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: pushTokenData,
      },
    );
  typia.assert(registeredToken);

  // Step 3: Validate that all metadata fields are correctly stored
  TestValidator.equals(
    "platform should match",
    registeredToken.platform,
    pushTokenData.platform,
  );
  TestValidator.equals(
    "device token should match",
    registeredToken.device_token,
    pushTokenData.device_token,
  );
  TestValidator.equals(
    "device model should match",
    registeredToken.device_model,
    pushTokenData.device_model,
  );
  TestValidator.equals(
    "app version should match",
    registeredToken.app_version,
    pushTokenData.app_version,
  );
  TestValidator.equals(
    "token status should be active",
    registeredToken.token_status,
    "active",
  );

  // Step 4: Validate member association
  TestValidator.equals(
    "token should be associated with member",
    registeredToken.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "member association should exist",
    registeredToken.member !== undefined,
  );

  if (registeredToken.member) {
    TestValidator.equals(
      "member ID should match",
      registeredToken.member.id,
      member.id,
    );
    TestValidator.equals(
      "member email should match",
      registeredToken.member.email,
      member.email,
    );
  }

  // Step 5: Validate timestamp fields
  TestValidator.predicate(
    "created_at should be set",
    registeredToken.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    registeredToken.updated_at !== undefined,
  );

  // Step 6: Test optional field handling by creating token without optional fields
  const minimalTokenData = {
    platform: "android",
    device_token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityPlatformPushToken.ICreate;

  const minimalToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: minimalTokenData,
      },
    );
  typia.assert(minimalToken);

  TestValidator.equals(
    "minimal token platform should match",
    minimalToken.platform,
    minimalTokenData.platform,
  );
  TestValidator.equals(
    "minimal token device token should match",
    minimalToken.device_token,
    minimalTokenData.device_token,
  );
  TestValidator.predicate(
    "minimal token device_model should be undefined",
    minimalToken.device_model === undefined,
  );
  TestValidator.predicate(
    "minimal token app_version should be undefined",
    minimalToken.app_version === undefined,
  );
}
