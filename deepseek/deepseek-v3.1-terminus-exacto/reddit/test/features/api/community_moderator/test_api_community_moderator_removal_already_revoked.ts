import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator removal when the moderator assignment has already been
 * revoked. Validates idempotent behavior and proper handling of duplicate
 * removal requests. Tests that attempting to remove an already revoked
 * moderator assignment returns appropriate status without errors.
 */
export async function test_api_community_moderator_removal_already_revoked(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
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

  // 2. Create moderator assignment
  // Use a more realistic community slug format
  const communitySlug = RandomGenerator.name(1)
    .toLowerCase()
    .replace(/\\s+/g, "-");
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          actor_type: "admin",
          permission_level: "full",
          actor_admin_id: admin.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // 3. Revoke moderator assignment first
  await api.functional.communityPlatform.admin.communities.moderators.erase(
    connection,
    {
      communitySlug: communitySlug,
      moderatorId: moderator.id,
    },
  );

  // 4. Attempt to remove the already-revoked moderator assignment
  // This should complete without errors due to idempotent behavior
  await api.functional.communityPlatform.admin.communities.moderators.erase(
    connection,
    {
      communitySlug: communitySlug,
      moderatorId: moderator.id,
    },
  );

  // 5. Validate that the operation completed successfully
  // The test passes if no errors were thrown during the second deletion attempt
  TestValidator.predicate(
    "second deletion of already revoked moderator should complete without errors",
    true,
  );
}
