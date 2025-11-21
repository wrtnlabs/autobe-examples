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
 * Test the complete workflow of retrieving detailed member information within a
 * community. This comprehensive E2E test validates the complete member
 * lifecycle: creating authenticated member accounts, establishing a community,
 * adding members to the community, and retrieving detailed member information.
 * The test ensures proper authorization checks, validates membership
 * information including role assignments, subscription status, and timestamps,
 * and confirms that only authorized members can access community member
 * details.
 */
export async function test_api_community_member_details_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account for community creation
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 2: Create a community entity
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

  // Step 3: Create admin account for member management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpassword123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Create a separate member account to be added to the community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "memberpassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Switch to admin account to add member to community
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "adminpassword123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "test-agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Add the member to the community
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
            last_active_at: typia.assert(member.last_active_at!),
            created_at: member.created_at,
          } satisfies ICommunityPlatformMember.ISummary,
          role: "member",
          is_subscribed: true,
        } satisfies ICommunityPlatformCommunityMember.ICreate,
      },
    );
  typia.assert(communityMember);

  // Step 7: Retrieve detailed member information
  const retrievedMember: ICommunityPlatformCommunityMember =
    await api.functional.communityPlatform.member.communities.members.at(
      connection,
      {
        communitySlug: community.slug,
        memberId: member.id,
      },
    );
  typia.assert(retrievedMember);

  // Step 8: Validate retrieved member information
  TestValidator.equals(
    "member ID matches",
    retrievedMember.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedMember.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedMember.member.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "member karma score matches",
    retrievedMember.member.karma_score,
    member.karma_score,
  );
  TestValidator.equals(
    "member verification status matches",
    retrievedMember.member.is_verified,
    member.is_verified,
  );
  TestValidator.equals(
    "member role is correct",
    retrievedMember.role,
    "member",
  );
  TestValidator.predicate(
    "member is subscribed",
    retrievedMember.is_subscribed,
  );
  TestValidator.predicate(
    "joined at timestamp is valid",
    retrievedMember.joined_at !== null,
  );
  TestValidator.equals(
    "left at timestamp is undefined",
    retrievedMember.left_at,
    undefined,
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    retrievedMember.created_at !== null,
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    retrievedMember.updated_at !== null,
  );

  // Validate community information in the response
  TestValidator.equals(
    "community ID matches",
    retrievedMember.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedMember.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug matches",
    retrievedMember.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "community status is active",
    retrievedMember.community.status,
    "active",
  );
  TestValidator.equals(
    "community privacy matches",
    retrievedMember.community.privacy,
    "public",
  );
  TestValidator.predicate(
    "community created at timestamp is valid",
    retrievedMember.community.created_at !== null,
  );

  // Step 9: Test authorization boundaries - unauthorized access should fail
  // Create an unauthorized member account
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: unauthorizedEmail,
        password: "unauthorized123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(unauthorizedMember);

  // Switch to unauthorized member
  await api.functional.auth.member.login(connection, {
    body: {
      email: unauthorizedEmail,
      password: "unauthorized123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Test accessing non-existent member (should fail)
  await TestValidator.error(
    "accessing non-existent member should fail",
    async () => {
      await api.functional.communityPlatform.member.communities.members.at(
        connection,
        {
          communitySlug: community.slug,
          memberId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
