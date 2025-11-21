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
 * Test successful push token retrieval by an administrator.
 *
 * This test validates that administrators can retrieve detailed information
 * about specific push tokens registered in the system. The test creates a
 * member account, registers a push token, then switches to an administrator
 * account to retrieve and validate the token details.
 *
 * The test verifies comprehensive token information including platform details,
 * device specifications, token status, usage metadata, and associated user
 * information. All token fields from the Prisma schema are validated with
 * proper formatting and security considerations for administrative access.
 */
export async function test_api_push_token_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Register a push token as member
  const pushToken =
    await api.functional.communityPlatform.member.pushTokens.create(
      connection,
      {
        body: {
          platform: "ios",
          device_token: RandomGenerator.alphaNumeric(64),
          device_model: "iPhone15,3",
          app_version: "1.0.0",
          token_status: "active",
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(pushToken);

  // Step 3: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

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

  // Step 4: Authenticate as administrator (FIXED: Added await)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(32),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Retrieve push token as administrator
  const retrievedToken =
    await api.functional.communityPlatform.admin.pushTokens.at(connection, {
      tokenId: pushToken.id,
    });
  typia.assert(retrievedToken);

  // Step 6: Validate token details
  TestValidator.equals("token ID matches", retrievedToken.id, pushToken.id);
  TestValidator.equals(
    "platform matches",
    retrievedToken.platform,
    pushToken.platform,
  );
  TestValidator.equals(
    "device token matches",
    retrievedToken.device_token,
    pushToken.device_token,
  );
  TestValidator.equals(
    "device model matches",
    retrievedToken.device_model,
    pushToken.device_model,
  );
  TestValidator.equals(
    "app version matches",
    retrievedToken.app_version,
    pushToken.app_version,
  );
  TestValidator.equals(
    "token status matches",
    retrievedToken.token_status,
    pushToken.token_status,
  );

  // Validate timestamp fields
  TestValidator.equals(
    "created at timestamp matches",
    retrievedToken.created_at,
    pushToken.created_at,
  );
  TestValidator.equals(
    "updated at timestamp matches",
    retrievedToken.updated_at,
    pushToken.updated_at,
  );

  // Validate nullable timestamp fields (ADDED: Validation for nullable fields)
  TestValidator.equals(
    "last used at matches",
    retrievedToken.last_used_at,
    pushToken.last_used_at,
  );
  TestValidator.equals(
    "expires at matches",
    retrievedToken.expires_at,
    pushToken.expires_at,
  );

  // Validate member association
  TestValidator.equals(
    "member ID association matches",
    retrievedToken.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "member summary should be present",
    retrievedToken.member !== undefined,
  );

  if (retrievedToken.member) {
    TestValidator.equals(
      "member ID in summary matches",
      retrievedToken.member.id,
      member.id,
    );
    TestValidator.equals(
      "member email in summary matches",
      retrievedToken.member.email,
      member.email,
    );
    TestValidator.equals(
      "member display name in summary matches",
      retrievedToken.member.display_name,
      member.display_name,
    );
  }

  // Validate moderator and admin association fields (ADDED: Validation for other association fields)
  TestValidator.equals(
    "moderator ID should be undefined",
    retrievedToken.community_platform_moderator_id,
    undefined,
  );
  TestValidator.equals(
    "admin ID should be undefined",
    retrievedToken.community_platform_admin_id,
    undefined,
  );
  TestValidator.predicate(
    "moderator summary should be undefined",
    retrievedToken.moderator === undefined,
  );
  TestValidator.predicate(
    "admin summary should be undefined",
    retrievedToken.admin === undefined,
  );
}
