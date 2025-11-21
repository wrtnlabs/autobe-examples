import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator's ability to retrieve detailed member information by UUID.
 *
 * This test validates the complete workflow of administrative member
 * management:
 *
 * 1. Create admin account with proper privileges
 * 2. Create member account with comprehensive profile data
 * 3. Authenticate as admin to establish administrative context
 * 4. Retrieve member information using the member's UUID
 * 5. Validate that response contains comprehensive member data while filtering out
 *    sensitive authentication information
 *
 * The test ensures that administrators can access complete member profiles for
 * management purposes while maintaining security by excluding sensitive data
 * like password hashes and authentication tokens.
 */
export async function test_api_admin_member_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account that will be retrieved by admin
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: typia.random<string>(),
        href: "https://example.com/registration",
        referrer: "https://example.com/referral",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com/admin/dashboard",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Retrieve member information as admin
  const memberSummary: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(memberSummary);

  // Step 5: Validate response structure and data integrity
  TestValidator.equals(
    "member ID should match created member ID",
    memberSummary.id,
    member.id,
  );
  TestValidator.equals(
    "member email should match created member email",
    memberSummary.email,
    member.email,
  );
  TestValidator.equals(
    "member display name should match created member display name",
    memberSummary.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "karma score should be 0 for new member",
    memberSummary.karma_score,
    0,
  );
  TestValidator.equals(
    "new member should not be verified",
    memberSummary.is_verified,
    false,
  );
  TestValidator.predicate(
    "last active at should be a valid date",
    memberSummary.last_active_at !== null &&
      memberSummary.last_active_at !== undefined,
  );
  TestValidator.predicate(
    "created at should be a valid date",
    memberSummary.created_at !== null && memberSummary.created_at !== undefined,
  );

  // Step 6: Verify sensitive data is filtered out using proper type-safe checking
  TestValidator.predicate(
    "response should be ISummary type without password_hash",
    !("password_hash" in memberSummary),
  );
  TestValidator.predicate(
    "response should be ISummary type without token",
    !("token" in memberSummary),
  );
  TestValidator.predicate(
    "response should be ISummary type without updated_at",
    !("updated_at" in memberSummary),
  );
  TestValidator.predicate(
    "response should be ISummary type without deleted_at",
    !("deleted_at" in memberSummary),
  );
}
