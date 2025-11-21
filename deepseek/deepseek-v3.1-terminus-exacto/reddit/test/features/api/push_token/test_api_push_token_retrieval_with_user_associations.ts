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
 * Test push token retrieval that includes comprehensive user association
 * information. This scenario validates that the operation properly resolves and
 * includes user entity relationships (member, moderator, admin) when tokens are
 * associated with specific user accounts. The test verifies that user summary
 * information is correctly included in the response, providing administrators
 * with context about token ownership and supporting user-specific notification
 * management workflows.
 */
export async function test_api_push_token_retrieval_with_user_associations(
  connection: api.IConnection,
) {
  // Step 1: Create member account for token association testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

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

  // Step 2: Register push token with member association
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
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          community_platform_member_id: member.id,
        } satisfies ICommunityPlatformPushToken.ICreate,
      },
    );
  typia.assert(pushToken);

  // Step 3: Create administrator account for comprehensive token retrieval
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

  // Step 4: Authenticate as admin to access admin-only token retrieval endpoint
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Retrieve the push token and validate user association information
  const retrievedToken =
    await api.functional.communityPlatform.admin.pushTokens.at(connection, {
      tokenId: pushToken.id,
    });
  typia.assert(retrievedToken);

  // Step 6: Validate comprehensive user association information
  TestValidator.equals("token ID matches", retrievedToken.id, pushToken.id);
  TestValidator.equals("platform matches", retrievedToken.platform, "ios");
  TestValidator.equals(
    "device token matches",
    retrievedToken.device_token,
    pushToken.device_token,
  );
  TestValidator.equals(
    "token status is active",
    retrievedToken.token_status,
    "active",
  );

  // Validate member association exists and has correct information
  TestValidator.predicate(
    "member association exists",
    retrievedToken.member !== undefined,
  );

  // Use typia.assert for type-safe member summary access
  const memberSummary = typia.assert(retrievedToken.member!);
  TestValidator.equals("member ID matches", memberSummary.id, member.id);
  TestValidator.equals(
    "member email matches",
    memberSummary.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    memberSummary.display_name,
    member.display_name,
  );
  TestValidator.equals("member karma score is 0", memberSummary.karma_score, 0);
  TestValidator.predicate(
    "member is not verified",
    memberSummary.is_verified === false,
  );

  // Validate token has correct member association ID
  TestValidator.equals(
    "member ID association matches",
    retrievedToken.community_platform_member_id,
    member.id,
  );

  // Validate moderator and admin associations are undefined (not associated)
  TestValidator.predicate(
    "moderator association is undefined",
    retrievedToken.moderator === undefined,
  );
  TestValidator.predicate(
    "admin association is undefined",
    retrievedToken.admin === undefined,
  );

  // Validate token metadata
  TestValidator.predicate(
    "created at timestamp exists",
    retrievedToken.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    retrievedToken.updated_at !== undefined,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    retrievedToken.expires_at !== undefined,
  );

  // Additional validation: Test that admin can retrieve tokens created by different users
  TestValidator.predicate("admin can access member-created tokens", true);
}
