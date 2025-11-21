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
 * Test comprehensive member account update workflow where an administrator
 * modifies member profile information including display name, karma score, and
 * verification status.
 *
 * This test validates that administrators can update member accounts with
 * proper authentication and that all field updates are correctly persisted. It
 * also verifies that the updated member information is returned with the
 * correct response structure and that prerequisite member creation is properly
 * handled.
 */
export async function test_api_member_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
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

  // Step 2: Create member account that will be updated by the administrator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Establish member existence prerequisite by creating a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Authenticate as administrator to gain update permissions
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Update member information with various field modifications
  const updateData = {
    display_name: "Updated " + RandomGenerator.name(),
    karma_score: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    is_verified: true,
  } satisfies ICommunityPlatformMember.IUpdate;

  const updatedMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: updateData,
    });
  typia.assert(updatedMember);

  // Step 6: Verify that the updated member information is correctly persisted
  TestValidator.equals(
    "updated display name matches",
    updatedMember.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "updated karma score matches",
    updatedMember.karma_score,
    updateData.karma_score,
  );
  TestValidator.equals(
    "updated verification status matches",
    updatedMember.is_verified,
    updateData.is_verified,
  );
  TestValidator.equals(
    "member ID remains unchanged",
    updatedMember.id,
    member.id,
  );
  TestValidator.equals(
    "member email remains unchanged",
    updatedMember.email,
    member.email,
  );
}
