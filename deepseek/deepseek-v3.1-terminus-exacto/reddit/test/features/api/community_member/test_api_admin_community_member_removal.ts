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
 * Test the complete workflow of an administrator removing a member from a
 * community. Validates that administrators can properly manage community
 * membership by removing users who violate community guidelines or request to
 * leave. The scenario covers authentication establishment, community creation,
 * member addition, and final removal operation with proper authorization
 * checks.
 */
export async function test_api_admin_community_member_removal(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
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

  // Step 2: Create a community as administrator
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as a regular member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Add the member to the community
  const communityMember: ICommunityPlatformCommunityMember =
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
            last_active_at: member.last_active_at ?? new Date().toISOString(),
            created_at: member.created_at,
          } satisfies ICommunityPlatformMember.ISummary,
          role: "member",
          is_subscribed: true,
        } satisfies ICommunityPlatformCommunityMember.ICreate,
      },
    );
  typia.assert(communityMember);

  // Step 5: Switch back to administrator context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Remove the member from the community using admin API
  const removedMember: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.admin.communities.members.eraseByCommunityslugAndCommunityplatformmemberid(
      connection,
      {
        communitySlug: community.slug,
        communityPlatformMemberId: communityMember.id,
      },
    );
  typia.assert(removedMember);

  // Step 7: Validate that the removal was successful
  TestValidator.equals(
    "removed member should have left_at timestamp set",
    removedMember.left_at !== undefined,
    true,
  );
  TestValidator.equals(
    "removed member ID should match original member ID",
    removedMember.member.id,
    member.id,
  );
  TestValidator.equals(
    "removed member community ID should match original community ID",
    removedMember.community.id,
    community.id,
  );
}
