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
 * Test specific workflow where administrator updates member verification status
 * from unverified to verified. This scenario validates the business logic
 * around email verification requirements and ensures that verification status
 * changes are properly handled. It also tests that the karma score can be
 * updated simultaneously with verification status changes.
 */
export async function test_api_member_update_verification_status(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
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

  // Step 2: Create unverified member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Verify member starts as unverified with karma score 0
  TestValidator.equals("member starts unverified", member.is_verified, false);
  TestValidator.equals(
    "member starts with karma score 0",
    member.karma_score,
    0,
  );

  // Step 3: Create community to fulfill member existence prerequisite
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to admin authentication
  const adminLoginResult: ICommunityPlatformAdmin.IAuthorized =
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
  typia.assert(adminLoginResult);

  // Step 5: Update member verification status and karma score
  const updatedMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: {
        is_verified: true,
        karma_score: 10,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(updatedMember);

  // Step 6: Validate the updates
  TestValidator.equals(
    "member is now verified",
    updatedMember.is_verified,
    true,
  );
  TestValidator.equals("karma score updated", updatedMember.karma_score, 10);
  TestValidator.equals(
    "email remains unchanged",
    updatedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "display name remains unchanged",
    updatedMember.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "member ID remains unchanged",
    updatedMember.id,
    member.id,
  );
}
