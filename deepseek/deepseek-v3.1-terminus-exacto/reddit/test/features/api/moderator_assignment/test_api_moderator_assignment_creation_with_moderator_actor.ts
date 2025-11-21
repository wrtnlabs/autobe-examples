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
 * Test moderator assignment creation targeting moderator actors for
 * hierarchical moderation structures.
 *
 * This comprehensive E2E test validates the complete workflow of assigning
 * moderator privileges to existing moderators within a community platform. The
 * test ensures that administrators can properly assign moderator roles with
 * appropriate permission levels (full, content_only, limited) and validates the
 * hierarchical moderation structure functionality.
 *
 * The test follows this sequence:
 *
 * 1. Create administrator account for platform management
 * 2. Create target community for moderator assignment
 * 3. Create moderator account to be assigned additional privileges
 * 4. Authenticate as administrator and create moderator assignment
 * 5. Validate the assignment was created correctly with proper permissions
 */
export async function test_api_moderator_assignment_creation_with_moderator_actor(
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
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined,
  );

  // Step 2: Create target community
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community name matches input",
    community.name,
    communityName,
  );
  TestValidator.equals(
    "community slug matches input",
    community.slug,
    communitySlug,
  );

  // Step 3: Create moderator account to be assigned
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorDisplayName = RandomGenerator.name();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: moderatorDisplayName,
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator display name matches input",
    moderator.display_name,
    moderatorDisplayName,
  );

  // Step 4: Authenticate as administrator
  const adminLoginResult: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: "https://example.com/admin",
        referrer: "https://example.com/",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Test Agent",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(adminLoginResult);
  TestValidator.equals(
    "admin login returns same admin ID",
    adminLoginResult.id,
    admin.id,
  );

  // Step 5: Create moderator assignment with moderator actor
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          actor_type: "moderator",
          permission_level: "full",
          actor_moderator_id: moderator.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 6: Validate the assignment
  TestValidator.equals(
    "assignment community ID matches target community",
    moderatorAssignment.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "assignment actor type is moderator",
    moderatorAssignment.actor_type,
    "moderator",
  );
  TestValidator.equals(
    "assignment permission level is full",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.equals(
    "assignment actor ID matches moderator ID",
    moderatorAssignment.actor.id,
    moderator.id,
  );
  TestValidator.predicate(
    "assignment is not revoked",
    moderatorAssignment.revoked_at === undefined,
  );
  TestValidator.predicate(
    "assignment has assigned timestamp",
    moderatorAssignment.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "assignment community summary matches",
    moderatorAssignment.community.id === community.id,
  );
}
