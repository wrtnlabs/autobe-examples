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
 * Test administrator member detail retrieval with proper authorization checks.
 *
 * This test validates that administrators can access detailed member
 * information while ensuring proper authorization boundaries are enforced. It
 * creates both admin and member accounts, authenticates as admin, retrieves
 * member details, and tests that lower-privilege roles cannot access this
 * endpoint.
 */
export async function test_api_admin_member_detail_permission(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: "Test Administrator",
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: "Test Member",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Authenticate as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Retrieve member details using admin endpoint
  const memberDetails: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.at(connection, {
      memberId: member.id,
    });
  typia.assert(memberDetails);

  // Step 5: Validate that admin can access detailed member information
  TestValidator.equals(
    "retrieved member ID matches created member",
    memberDetails.id,
    member.id,
  );
  TestValidator.equals(
    "retrieved member email matches created member",
    memberDetails.email,
    member.email,
  );
  TestValidator.equals(
    "retrieved member display name matches created member",
    memberDetails.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "karma score is zero for new member",
    memberDetails.karma_score,
    0,
  );
  TestValidator.predicate(
    "new member is not verified",
    !memberDetails.is_verified,
  );

  // Step 6: Test authorization boundaries - attempt to access admin endpoint without admin privileges
  // Create a separate connection without admin authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "non-admin should not access admin member endpoint",
    async () => {
      await api.functional.communityPlatform.admin.members.at(unauthConn, {
        memberId: member.id,
      });
    },
  );

  // Additional validation: Test with non-existent member ID
  await TestValidator.error("non-existent member ID should fail", async () => {
    await api.functional.communityPlatform.admin.members.at(connection, {
      memberId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
