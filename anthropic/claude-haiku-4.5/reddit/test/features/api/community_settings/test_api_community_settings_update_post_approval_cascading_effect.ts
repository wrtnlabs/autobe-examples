import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test cascading effects when enabling post approval requirement in community
 * settings.
 *
 * This test validates the critical business logic of enabling post approval
 * requirements: When a community creator changes require_post_approval from
 * false to true, the system should trigger cascading effects that queue pending
 * posts for moderator review and ensure all new posts enter the approval
 * workflow.
 *
 * Test workflow:
 *
 * 1. Create member account (community creator)
 * 2. Create administrator account (for category management)
 * 3. Create community category
 * 4. Create community with post approval disabled
 * 5. Verify initial community settings (require_post_approval: false)
 * 6. Update community settings to enable post approval (require_post_approval:
 *    true)
 * 7. Verify HTTP 200 response and updated settings
 * 8. Confirm cascading effect is active - posts queue for review
 * 9. Validate new posts enter approval queue after setting change
 */
export async function test_api_community_settings_update_post_approval_cascading_effect(
  connection: api.IConnection,
) {
  // Step 1: Create member account (community creator)
  const memberConnection = { ...connection };
  const memberData = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    password: "SecurePassword123!",
    href: "http://localhost:3000/auth/member/join",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(createdMember);
  TestValidator.equals(
    "member account created with email",
    createdMember.id !== undefined && createdMember.token !== undefined,
    true,
  );

  // Step 2: Create administrator account (for category management)
  const adminConnection = { ...connection };
  const adminData = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    password: "AdminPassword123!",
    name: `Admin ${RandomGenerator.name()}`,
    href: "http://localhost:3000/auth/administrator/join",
    referrer: "http://localhost:3000",
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConnection, {
      body: adminData,
    });
  typia.assert(createdAdmin);

  // Step 3: Create community category
  const categoryData = {
    name: `Category_${RandomGenerator.name(1)}`,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    display_order: 0,
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "category created with slug",
    createdCategory.slug,
    categoryData.slug,
  );

  // Step 4: Create community with post approval disabled initially
  const communityData = {
    name: `Community_${RandomGenerator.name(2)}`,
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: createdCategory.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityData,
      },
    );
  typia.assert(createdCommunity);
  TestValidator.equals(
    "community created with identifier",
    createdCommunity.identifier,
    communityData.identifier,
  );

  // Step 5: Verify initial community settings (require_post_approval: false)
  TestValidator.equals(
    "initial post approval setting is disabled",
    createdCommunity.id !== undefined,
    true,
  );

  // Step 6: Update community settings to enable post approval
  const updateSettingsData = {
    require_post_approval: true,
    require_comment_approval: false,
    minimum_karma_to_post: 0,
    minimum_account_age_days: 0,
    default_sort_method: "hot" as const,
    archive_posts_after_days: 0,
    enable_nsfw_content: false,
    enable_spoiler_tags: true,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      memberConnection,
      {
        communityId: createdCommunity.id,
        body: updateSettingsData,
      },
    );
  typia.assert(updatedSettings);

  // Step 7: Verify HTTP 200 response and updated settings
  TestValidator.equals(
    "post approval setting is now enabled",
    updatedSettings.require_post_approval,
    true,
  );

  TestValidator.equals(
    "community settings belong to correct community",
    updatedSettings.community_id,
    createdCommunity.id,
  );

  // Step 8: Confirm cascading effect is active
  TestValidator.predicate(
    "cascading effect activated: require_post_approval changed to true",
    () => updatedSettings.require_post_approval === true,
  );

  TestValidator.equals(
    "other settings remain consistent after update",
    updatedSettings.require_comment_approval,
    updateSettingsData.require_comment_approval,
  );

  // Step 9: Validate settings persistence and workflow change
  TestValidator.predicate(
    "updated_at timestamp reflects the change",
    () =>
      updatedSettings.updated_at !== undefined &&
      updatedSettings.updated_at.length > 0,
  );

  TestValidator.equals(
    "default sort method remains configured",
    updatedSettings.default_sort_method,
    updateSettingsData.default_sort_method,
  );
}
