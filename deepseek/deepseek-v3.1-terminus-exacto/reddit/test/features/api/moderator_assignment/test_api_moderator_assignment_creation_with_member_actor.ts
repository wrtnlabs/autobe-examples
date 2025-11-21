import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator assignment creation specifically targeting member actors.
 *
 * This test validates that administrators can assign moderator privileges to
 * regular community members with appropriate permission levels. It ensures
 * proper validation of member actor references, permission level assignment,
 * and community context. The test verifies that member-to-moderator role
 * transitions are handled correctly with proper audit trail and relationship
 * management.
 */
export async function test_api_moderator_assignment_creation_with_member_actor(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for moderator assignment operations
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to be assigned as moderator
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create target community for moderator assignment
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Authenticate as administrator to perform moderator assignment
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123",
      href: "https://example.com/admin",
      referrer: "https://example.com/dashboard",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create moderator assignment with member actor type
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          actor_type: "member",
          permission_level: "full",
          actor_member_id: member.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 6: Validate the moderator assignment was created successfully
  TestValidator.equals(
    "actor_type should be 'member'",
    moderatorAssignment.actor_type,
    "member",
  );
  TestValidator.equals(
    "permission_level should be 'full'",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.equals(
    "community ID should match",
    moderatorAssignment.community_platform_community_id,
    community.id,
  );
  TestValidator.predicate(
    "assigned_at should be set",
    moderatorAssignment.assigned_at !== null,
  );
  TestValidator.predicate(
    "revoked_at should be null for active assignment",
    moderatorAssignment.revoked_at === undefined,
  );

  // Step 7: Verify actor reference is correct
  TestValidator.predicate(
    "actor should be ICommunityPlatformMember.ISummary",
    (moderatorAssignment.actor as ICommunityPlatformMember.ISummary).email !==
      undefined,
  );

  const actorMember =
    moderatorAssignment.actor as ICommunityPlatformMember.ISummary;
  TestValidator.equals(
    "actor member ID should match created member",
    actorMember.id,
    member.id,
  );
  TestValidator.equals(
    "actor member email should match",
    actorMember.email,
    member.email,
  );

  // Additional validations
  TestValidator.predicate(
    "created_at should be set",
    moderatorAssignment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be set",
    moderatorAssignment.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be null",
    moderatorAssignment.deleted_at === undefined,
  );

  // Verify community context
  TestValidator.equals(
    "community name should match",
    moderatorAssignment.community.name,
    community.name,
  );
  TestValidator.equals(
    "community slug should match",
    moderatorAssignment.community.slug,
    community.slug,
  );

  // Enhanced validations
  TestValidator.predicate(
    "moderator assignment ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorAssignment.id,
    ),
  );
  TestValidator.predicate(
    "community creation timestamp should be valid",
    community.created_at !== null,
  );
}
