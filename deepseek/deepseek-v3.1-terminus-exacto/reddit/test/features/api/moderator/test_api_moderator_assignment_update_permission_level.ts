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
 * Test moderator assignment update workflow focusing on permission level
 * modifications.
 *
 * This test validates that administrators can successfully update moderator
 * permission levels (full, content_only, limited) for existing assignments. The
 * test ensures proper validation of assignment existence, permission level
 * changes, and immediate effect of permission modifications. It verifies that
 * updated assignments reflect the new permission levels while maintaining all
 * other assignment attributes unchanged.
 */
export async function test_api_moderator_assignment_update_permission_level(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for moderator assignment operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword satisfies string as string,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to be assigned as moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: "https://example.com/register" satisfies string as string,
        referrer: "https://example.com" satisfies string as string,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community for moderator assignment
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
          category: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to admin authentication for moderator operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: undefined,
      href: "https://example.com/admin" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Create initial moderator assignment with specific permission level
  const initialPermissionLevel = "content_only";
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          actor_type: "member",
          permission_level: initialPermissionLevel,
          actor_member_id: member.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Verify initial assignment properties
  TestValidator.equals(
    "initial permission level should be content_only",
    moderatorAssignment.permission_level,
    initialPermissionLevel,
  );

  TestValidator.equals(
    "actor type should be member",
    moderatorAssignment.actor_type,
    "member",
  );

  TestValidator.equals(
    "community ID should match created community",
    moderatorAssignment.community_platform_community_id,
    community.id,
  );

  TestValidator.equals(
    "actor ID should match created member",
    moderatorAssignment.actor.id,
    member.id,
  );

  TestValidator.predicate(
    "assigned_at timestamp should be set",
    moderatorAssignment.assigned_at !== null &&
      moderatorAssignment.assigned_at !== undefined,
  );

  // Step 5: Update the moderator assignment with different permission level
  const updatedPermissionLevel = "full";
  const updatedModeratorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      connection,
      {
        communitySlug: community.slug,
        moderatorId: moderatorAssignment.id,
        body: {
          permission_level: updatedPermissionLevel,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModeratorAssignment);

  // Step 6: Verify the updated assignment reflects the new permission level
  TestValidator.equals(
    "updated permission level should be full",
    updatedModeratorAssignment.permission_level,
    updatedPermissionLevel,
  );

  // Step 7: Validate that other assignment attributes remain unchanged
  TestValidator.equals(
    "actor type should remain unchanged",
    updatedModeratorAssignment.actor_type,
    moderatorAssignment.actor_type,
  );

  TestValidator.equals(
    "community ID should remain unchanged",
    updatedModeratorAssignment.community_platform_community_id,
    moderatorAssignment.community_platform_community_id,
  );

  TestValidator.equals(
    "actor ID should remain unchanged",
    updatedModeratorAssignment.actor.id,
    moderatorAssignment.actor.id,
  );

  TestValidator.equals(
    "assigned_at timestamp should remain unchanged",
    updatedModeratorAssignment.assigned_at,
    moderatorAssignment.assigned_at,
  );

  TestValidator.equals(
    "revoked_at should remain unchanged",
    updatedModeratorAssignment.revoked_at,
    moderatorAssignment.revoked_at,
  );

  // Additional validation: Test another permission level change
  const finalPermissionLevel = "limited";
  const finalModeratorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.update(
      connection,
      {
        communitySlug: community.slug,
        moderatorId: moderatorAssignment.id,
        body: {
          permission_level: finalPermissionLevel,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(finalModeratorAssignment);

  TestValidator.equals(
    "final permission level should be limited",
    finalModeratorAssignment.permission_level,
    finalPermissionLevel,
  );

  // Validate that all core properties remain consistent through all updates
  TestValidator.equals(
    "actor type consistency through all updates",
    finalModeratorAssignment.actor_type,
    moderatorAssignment.actor_type,
  );

  TestValidator.equals(
    "community ID consistency through all updates",
    finalModeratorAssignment.community_platform_community_id,
    moderatorAssignment.community_platform_community_id,
  );

  TestValidator.equals(
    "actor ID consistency through all updates",
    finalModeratorAssignment.actor.id,
    moderatorAssignment.actor.id,
  );

  // Test error case: Attempt to update non-existent moderator assignment
  await TestValidator.error(
    "should fail when updating non-existent moderator assignment",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.update(
        connection,
        {
          communitySlug: community.slug,
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            permission_level: "full",
          } satisfies ICommunityPlatformCommunityModerator.IUpdate,
        },
      );
    },
  );
}
