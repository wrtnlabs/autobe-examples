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
 * Test moderator assignment creation targeting administrator actors for
 * platform-wide oversight roles.
 *
 * This comprehensive E2E test validates that administrators can assign
 * moderator privileges to other administrators with appropriate permission
 * levels. The test ensures proper validation of admin actor references and
 * supports administrative oversight across community moderation workflows.
 *
 * Workflow:
 *
 * 1. Create two administrator accounts - assigning admin and target admin
 * 2. Create a community for moderator assignment context
 * 3. Authenticate as the assigning admin
 * 4. Create moderator assignment for target admin with permission levels
 * 5. Validate assignment creation and properties
 */
export async function test_api_moderator_assignment_creation_with_admin_actor(
  connection: api.IConnection,
) {
  // Step 1: Create assigning administrator account
  const assigningAdminEmail = typia.random<string & tags.Format<"email">>();
  const assigningAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: assigningAdminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(assigningAdmin);

  // Step 2: Create target administrator account
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        password: "TargetAdmin456!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Create community for moderator assignment context
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: communitySlug,
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Authenticate as assigning admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: assigningAdminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://platform.example.com/admin",
      referrer: "https://platform.example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create moderator assignment for target admin
  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: community.slug,
        body: {
          actor_type: "admin",
          permission_level: "full",
          actor_admin_id: targetAdmin.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 6: Validate moderator assignment properties
  TestValidator.equals(
    "moderator assignment has correct actor type",
    moderatorAssignment.actor_type,
    "admin",
  );
  TestValidator.equals(
    "moderator assignment has correct permission level",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.equals(
    "moderator assignment references correct community",
    moderatorAssignment.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator assignment references correct admin actor",
    moderatorAssignment.actor.id,
    targetAdmin.id,
  );
  TestValidator.predicate(
    "moderator assignment has assignment timestamp",
    moderatorAssignment.assigned_at !== null,
  );
  TestValidator.predicate(
    "moderator assignment is not revoked",
    moderatorAssignment.revoked_at === undefined,
  );

  // Additional validation: Ensure actor summary matches target admin
  const actorSummary =
    moderatorAssignment.actor as ICommunityPlatformAdmin.ISummary;
  TestValidator.equals(
    "actor summary display name matches target admin",
    actorSummary.display_name,
    targetAdmin.display_name,
  );
  TestValidator.equals(
    "actor summary admin level matches target admin",
    actorSummary.admin_level,
    targetAdmin.admin_level,
  );
}
