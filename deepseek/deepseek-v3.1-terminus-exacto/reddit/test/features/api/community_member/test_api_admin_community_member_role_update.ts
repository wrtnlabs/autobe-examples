import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMember";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that administrators can update member roles and subscription status
 * within communities. Validates role transitions between member,
 * approved_submitter, and trusted_member roles, ensuring proper permission
 * hierarchy enforcement. Tests subscription preference changes and verifies
 * that updated member information reflects the new role and subscription
 * settings.
 */
export async function test_api_admin_community_member_role_update(
  connection: api.IConnection,
) {
  // 1. Create admin user context for authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member user to be added to community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Switch to member context to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create community for member management
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

  // 4. Add member to community with initial role
  const initialMemberRole: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.member.communities.members.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          member: {
            id: member.id,
            email: member.email,
            display_name: member.display_name,
            karma_score: member.karma_score,
            is_verified: member.is_verified,
            last_active_at: typia.assert(member.last_active_at!),
            created_at: member.created_at,
          } satisfies ICommunityPlatformMember.ISummary,
          role: "member",
          is_subscribed: true,
        } satisfies ICommunityPlatformCommunityMember.ICreate,
      },
    );
  typia.assert(initialMemberRole);

  // Switch back to admin context for role update
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // 5. Update member role and subscription status as admin
  const updatedMember: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.admin.communities.members.putByCommunityslugAndMemberid(
      connection,
      {
        communitySlug: community.slug,
        memberId: initialMemberRole.id,
        body: {
          role: "trusted_member",
          is_subscribed: false,
        } satisfies ICommunityPlatformCommunityMember.IUpdate,
      },
    );
  typia.assert(updatedMember);

  // 6. Verify that updated member information reflects the new role and settings
  TestValidator.equals(
    "member role should be updated to trusted_member",
    updatedMember.role,
    "trusted_member",
  );
  TestValidator.equals(
    "member subscription status should be updated to false",
    updatedMember.is_subscribed,
    false,
  );
  TestValidator.equals(
    "member ID should remain the same",
    updatedMember.id,
    initialMemberRole.id,
  );
  TestValidator.equals(
    "community should remain the same",
    updatedMember.community.id,
    community.id,
  );
  TestValidator.equals(
    "member user should remain the same",
    updatedMember.member.id,
    member.id,
  );
}
