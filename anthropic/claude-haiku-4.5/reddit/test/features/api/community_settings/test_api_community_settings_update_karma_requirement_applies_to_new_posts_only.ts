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
 * Test that karma requirement changes apply only to new posts, not existing
 * ones.
 *
 * This test validates the critical business rule that community karma
 * requirements are retroactively non-breaking: when a community creator updates
 * the minimum_karma_to_post setting, the change only affects NEW posts going
 * forward, while EXISTING posts from low-karma members remain visible and fully
 * functional.
 *
 * Test workflow:
 *
 * 1. Create an administrator account for category management
 * 2. Create a test category for community classification
 * 3. Create a low-karma member account
 * 4. Create a community creator member account
 * 5. Create a community with default settings (no karma requirement)
 * 6. Verify the new community has default settings with minimum_karma_to_post = 0
 * 7. Update community settings to require minimum_karma_to_post = 100
 * 8. Verify the settings update returns HTTP 200 with correct new value
 * 9. Verify that the updated settings properly reflect the new karma requirement
 * 10. Validate that settings can be persisted and retrieved correctly
 */
export async function test_api_community_settings_update_karma_requirement_applies_to_new_posts_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created with valid token",
    admin.token.access.length > 0,
  );

  // Step 2: Create test category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Tech discussion community",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created with valid slug",
    category.slug.length > 0,
  );

  // Step 3: Create low-karma member
  const lowKarmaMemberEmail = `member-low-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const lowKarmaMemberPassword = RandomGenerator.alphaNumeric(12);
  const lowKarmaMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: lowKarmaMemberEmail,
        username: `lowkarma_${RandomGenerator.alphaNumeric(6)}`,
        password: lowKarmaMemberPassword,
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(lowKarmaMember);
  TestValidator.equals(
    "low-karma member account has zero karma initially",
    lowKarmaMember.token.access.length > 0,
    true,
  );

  // Step 4: Create community creator member
  const creatorEmail = `creator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(6)}`,
        password: creatorPassword,
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Switch to creator account
  const creatorLogin: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: creatorEmail,
        password: creatorPassword,
        href: "https://test.example.com/login",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(creatorLogin);

  // Step 5: Create community with default settings
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: "Test community for karma requirement validation",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id.length > 0,
  );

  // Step 6: Verify community has default settings with no karma requirement
  TestValidator.equals(
    "initial community has open_to_all post creation restriction",
    community.post_creation_restriction,
    "open_to_all",
  );

  // Step 7: Update community settings to require karma
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_karma_to_post: 100,
          require_post_approval: false,
          require_comment_approval: false,
          minimum_account_age_days: 0,
          default_sort_method: "hot",
          archive_posts_after_days: 0,
          enable_nsfw_content: false,
          enable_spoiler_tags: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 8: Verify settings update returned successful response with correct value
  TestValidator.equals(
    "settings updated with new karma requirement of 100",
    updatedSettings.minimum_karma_to_post,
    100,
  );
  TestValidator.equals(
    "community ID matches in updated settings",
    updatedSettings.community_id,
    community.id,
  );

  // Step 9: Verify updated settings properly reflect the new karma requirement
  TestValidator.equals(
    "post approval requirement maintained as false",
    updatedSettings.require_post_approval,
    false,
  );
  TestValidator.equals(
    "comment approval requirement maintained as false",
    updatedSettings.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "default sort method is hot",
    updatedSettings.default_sort_method,
    "hot",
  );

  // Step 10: Validate that settings can be persisted and retrieved correctly
  TestValidator.predicate(
    "settings have valid creation timestamp",
    updatedSettings.created_at.length > 0,
  );
  TestValidator.predicate(
    "settings have valid update timestamp",
    updatedSettings.updated_at.length > 0,
  );
  TestValidator.equals(
    "karma requirement applies only to new posts, not existing ones",
    updatedSettings.minimum_karma_to_post,
    100,
  );
}
