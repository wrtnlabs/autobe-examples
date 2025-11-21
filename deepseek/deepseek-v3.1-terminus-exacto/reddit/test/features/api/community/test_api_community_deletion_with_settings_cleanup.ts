import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformCommunitySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySetting";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates community deletion workflow with proper settings cleanup
 * verification.
 *
 * This test ensures that when an administrator deletes a community, all
 * associated settings are properly removed from the system. The test follows a
 * multi-actor authentication pattern where a member creates a community with
 * specific settings, then an administrator performs the deletion and verifies
 * that settings cleanup occurs correctly.
 *
 * Key validation points:
 *
 * 1. Member authentication and community creation with realistic data
 * 2. Settings retrieval before deletion to confirm existence
 * 3. Administrator authentication and community deletion
 * 4. Verification that settings are no longer accessible after deletion
 * 5. Cascade deletion behavior validation
 */
export async function test_api_community_deletion_with_settings_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community with realistic data
  const communityName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  // Generate URL-safe slug that meets platform requirements
  const communitySlug = communityName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 20);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create administrator account for deletion
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Verify settings exist before deletion
  const settingsBeforeDeletion =
    await api.functional.communityPlatform.admin.communities.settings.at(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(settingsBeforeDeletion);
  TestValidator.equals(
    "settings should belong to created community",
    settingsBeforeDeletion.community.id,
    community.id,
  );

  // Step 5: Delete the community as administrator
  await api.functional.communityPlatform.admin.communities.erase(connection, {
    communitySlug: community.slug,
  });

  // Step 6: Verify settings are no longer accessible after community deletion
  await TestValidator.error(
    "settings should not be accessible after community deletion",
    async () => {
      await api.functional.communityPlatform.admin.communities.settings.at(
        connection,
        {
          communitySlug: community.slug,
        },
      );
    },
  );
}
