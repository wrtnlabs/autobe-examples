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
 * Test the complete workflow of removing a member from a community by an
 * administrator. This scenario validates the administrative privilege to remove
 * members from communities, including proper authentication, prerequisite
 * community creation, member addition, and final removal operation.
 */
export async function test_api_community_member_removal_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

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

  // Step 2: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: typia.random<string>(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community as the member
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

  // Step 4: Add the member to the community with proper last_active_at handling
  const memberSummary: ICommunityPlatformMember.ISummary = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    karma_score: member.karma_score,
    is_verified: member.is_verified,
    last_active_at: member.last_active_at ?? new Date().toISOString(),
    created_at: member.created_at,
  } satisfies ICommunityPlatformMember.ISummary;

  const membership: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.member.communities.members.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          member: memberSummary,
          role: "member",
          is_subscribed: true,
        } satisfies ICommunityPlatformCommunityMember.ICreate,
      },
    );
  typia.assert(membership);

  // Step 5: Switch to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string>(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Remove the member from the community using administrative privileges
  const removedMembership: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.admin.communities.members.eraseByCommunityslugAndMemberid(
      connection,
      {
        communitySlug: community.slug,
        memberId: member.id,
      },
    );
  typia.assert(removedMembership);

  // Step 7: Validate the removal operation with proper type checking
  TestValidator.equals(
    "membership ID should match",
    removedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "community ID should match",
    removedMembership.community.id,
    community.id,
  );
  TestValidator.equals(
    "member ID should match",
    removedMembership.member.id,
    member.id,
  );
  TestValidator.equals(
    "role should be preserved",
    removedMembership.role,
    membership.role,
  );
  TestValidator.equals(
    "subscription status should be preserved",
    removedMembership.is_subscribed,
    membership.is_subscribed,
  );

  // Proper null/undefined checking for left_at
  if (
    removedMembership.left_at === null ||
    removedMembership.left_at === undefined
  ) {
    throw new Error("left_at timestamp should be set after member removal");
  }

  const leftAt = typia.assert(removedMembership.left_at!);
  TestValidator.predicate(
    "left_at should be after joined_at",
    new Date(leftAt).getTime() > new Date(membership.joined_at).getTime(),
  );

  // Step 8: Test that regular members cannot perform administrative removal
  // Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: typia.random<string>(),
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Attempt to remove a member (should fail)
  await TestValidator.error(
    "regular member should not be able to remove members",
    async () => {
      await api.functional.communityPlatform.admin.communities.members.eraseByCommunityslugAndMemberid(
        connection,
        {
          communitySlug: community.slug,
          memberId: member.id,
        },
      );
    },
  );
}
