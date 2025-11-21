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
 * Test push token registration with explicit member ID association.
 *
 * This scenario validates that authorized users can register tokens for
 * specific member accounts when needed for testing or administrative purposes.
 * The test verifies that when a member ID is explicitly provided in the
 * request, the token is correctly associated with the specified member rather
 * than defaulting to the authenticated user's ID. This tests the flexibility of
 * the token registration system for different use cases while maintaining
 * proper access controls.
 */
export async function test_api_push_token_registration_with_explicit_member_association(
  connection: api.IConnection,
) {
  // Create first member account for authentication
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Create second member account for explicit token association
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Create third member account for additional testing
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member3Email,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // Note: Authentication is handled automatically by the SDK through the connection headers
  // The join operation establishes the authentication context for subsequent API calls

  // Register push token with explicit member2 association
  const pushTokenData = {
    platform: "ios",
    device_token: typia.random<string & tags.Format<"uuid">>(),
    device_model: "iPhone 15 Pro",
    app_version: "1.0.0",
    token_status: "active",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    community_platform_member_id: member2.id,
  } satisfies ICommunityPlatformPushToken.ICreate;

  const registeredToken: ICommunityPlatformPushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: pushTokenData,
      },
    );
  typia.assert(registeredToken);

  // Validate that token is correctly associated with member2
  TestValidator.equals(
    "token should be associated with explicitly specified member",
    registeredToken.community_platform_member_id,
    member2.id,
  );

  // Validate token properties match the registration data
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
    "token status should match",
    registeredToken.token_status,
    pushTokenData.token_status,
  );

  // Test that member association is not with authenticated user (member1)
  TestValidator.notEquals(
    "token should not be associated with authenticated member",
    registeredToken.community_platform_member_id,
    member1.id,
  );

  // Test that member association is not with the third member
  TestValidator.notEquals(
    "token should not be associated with unrelated member",
    registeredToken.community_platform_member_id,
    member3.id,
  );

  // Validate member summary is correctly populated
  TestValidator.predicate(
    "member summary should be present",
    registeredToken.member !== undefined,
  );
  TestValidator.equals(
    "member summary ID should match explicit association",
    registeredToken.member?.id,
    member2.id,
  );
  TestValidator.equals(
    "member summary email should match",
    registeredToken.member?.email,
    member2.email,
  );

  // Test Android platform registration
  const androidTokenData = {
    platform: "android",
    device_token: typia.random<string & tags.Format<"uuid">>(),
    device_model: "Samsung Galaxy S23",
    app_version: "2.1.0",
    token_status: "active",
    community_platform_member_id: member3.id,
  } satisfies ICommunityPlatformPushToken.ICreate;

  const androidToken: ICommunityPlatformPushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: androidTokenData,
      },
    );
  typia.assert(androidToken);

  // Validate Android token association
  TestValidator.equals(
    "Android token should be associated with specified member",
    androidToken.community_platform_member_id,
    member3.id,
  );

  // Test error condition: attempt to register token with non-existent member ID
  await TestValidator.error(
    "should fail when registering token with non-existent member ID",
    async () => {
      await api.functional.communityPlatform.member.pushTokens.create(
        connection,
        {
          body: {
            platform: "ios",
            device_token: typia.random<string & tags.Format<"uuid">>(),
            community_platform_member_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies ICommunityPlatformPushToken.ICreate,
        },
      );
    },
  );
}
