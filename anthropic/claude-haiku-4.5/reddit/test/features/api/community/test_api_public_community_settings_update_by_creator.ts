import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_public_community_settings_update_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to serve as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const creatorMemberConnection = { ...connection };
  const creatorMember = await api.functional.auth.member.join(
    creatorMemberConnection,
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(creatorMember);
  TestValidator.predicate(
    "creator member is authorized",
    !!creatorMember.token.access,
  );

  // Step 2: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminConnection = { ...connection };
  const administrator = await api.functional.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin-register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator is authorized",
    !!administrator.token.access,
  );

  // Step 3: Create a category for community classification
  const categorySlug = `category-${RandomGenerator.alphaNumeric(8)}`;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a public community as the authenticated member
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      creatorMemberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );

  // Step 5: Update the community settings to enable moderation requirements
  const updatedSettings =
    await api.functional.communityPlatform.communities.settings.update(
      creatorMemberConnection,
      {
        communityId: community.id,
        body: {
          require_post_approval: true,
          require_comment_approval: true,
          minimum_karma_to_post: 10,
          minimum_account_age_days: 1,
          default_sort_method: "hot",
          archive_posts_after_days: 90,
          enable_nsfw_content: false,
          enable_spoiler_tags: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);

  // Step 6: Verify the settings update response
  TestValidator.equals(
    "post approval is enabled",
    updatedSettings.require_post_approval,
    true,
  );
  TestValidator.equals(
    "comment approval is enabled",
    updatedSettings.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "minimum karma requirement set",
    updatedSettings.minimum_karma_to_post,
    10,
  );
  TestValidator.equals(
    "minimum account age set",
    updatedSettings.minimum_account_age_days,
    1,
  );
  TestValidator.equals(
    "default sort method is hot",
    updatedSettings.default_sort_method,
    "hot",
  );
  TestValidator.equals(
    "archive posts after 90 days",
    updatedSettings.archive_posts_after_days,
    90,
  );
  TestValidator.equals(
    "NSFW content disabled",
    updatedSettings.enable_nsfw_content,
    false,
  );
  TestValidator.equals(
    "spoiler tags enabled",
    updatedSettings.enable_spoiler_tags,
    true,
  );

  // Step 7: Create another member to test authorization checks
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberConnection = { ...connection };
  const otherMember = await api.functional.auth.member.join(
    otherMemberConnection,
    {
      body: {
        email: otherMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: "OtherPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(otherMember);

  // Step 8: Verify non-creator members cannot update settings (authorization check)
  await TestValidator.error(
    "non-creator member should not be able to update settings",
    async () => {
      await api.functional.communityPlatform.communities.settings.update(
        otherMemberConnection,
        {
          communityId: community.id,
          body: {
            require_post_approval: false,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );

  // Step 9: Verify creator can update settings again with different values
  const finalSettingsUpdate =
    await api.functional.communityPlatform.communities.settings.update(
      creatorMemberConnection,
      {
        communityId: community.id,
        body: {
          require_post_approval: false,
          require_comment_approval: false,
          minimum_karma_to_post: 0,
          minimum_account_age_days: 0,
          default_sort_method: "new",
          archive_posts_after_days: 0,
          enable_nsfw_content: true,
          enable_spoiler_tags: false,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(finalSettingsUpdate);
  TestValidator.equals(
    "post approval disabled in final update",
    finalSettingsUpdate.require_post_approval,
    false,
  );
  TestValidator.equals(
    "comment approval disabled in final update",
    finalSettingsUpdate.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "default sort method changed to new",
    finalSettingsUpdate.default_sort_method,
    "new",
  );
  TestValidator.equals(
    "NSFW content enabled in final update",
    finalSettingsUpdate.enable_nsfw_content,
    true,
  );
}
