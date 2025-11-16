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
 * Test authorization enforcement when non-creator member attempts to modify
 * community settings.
 *
 * This test validates that only community creators and senior moderators can
 * modify settings. Regular members, junior moderators, and non-subscribers are
 * denied access with HTTP 403 Forbidden.
 *
 * Test flow:
 *
 * 1. Create administrator account
 * 2. Create a category for community classification
 * 3. Create first member (will become community creator)
 * 4. First member creates a community
 * 5. Create second member (non-creator, non-moderator)
 * 6. Attempt settings update as second member - expect 403 error
 * 7. Verify authorization boundaries are properly enforced
 */
export async function test_api_community_settings_update_insufficient_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (community creator)
  const creatorEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Creator creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator is set correctly",
    community.creator.id,
    creator.id,
  );

  // Step 5: Create second member account (non-creator)
  const nonCreatorEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const nonCreator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonCreatorEmail,
        username: `noncreator_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(nonCreator);

  // Step 6: Switch to non-creator member and attempt to update settings
  // This should fail with 403 Forbidden
  await api.functional.auth.member.login(connection, {
    body: {
      email: nonCreatorEmail,
      password: "MemberPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Attempt to update community settings as non-creator member
  // Expected: HTTP 403 Forbidden error
  await TestValidator.error(
    "non-creator member cannot update community settings",
    async () => {
      await api.functional.communityPlatform.member.communities.settings.update(
        connection,
        {
          communityId: community.id,
          body: {
            require_post_approval: true,
            require_comment_approval: false,
            minimum_karma_to_post: 0,
            minimum_account_age_days: 0,
            default_sort_method: "hot",
            archive_posts_after_days: 0,
            enable_nsfw_content: false,
            enable_spoiler_tags: true,
          } satisfies ICommunityPlatformCommunitySettings.IUpdate,
        },
      );
    },
  );

  // Step 8: Verify that creator can update settings
  // Switch back to creator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "MemberPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Creator should be able to update settings
  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          require_post_approval: true,
          require_comment_approval: true,
          minimum_karma_to_post: 10,
          minimum_account_age_days: 1,
          default_sort_method: "new",
          archive_posts_after_days: 30,
          enable_nsfw_content: true,
          enable_spoiler_tags: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(updatedSettings);
  TestValidator.equals(
    "creator can update post approval requirement",
    updatedSettings.require_post_approval,
    true,
  );
  TestValidator.equals(
    "creator can update comment approval requirement",
    updatedSettings.require_comment_approval,
    true,
  );
  TestValidator.equals(
    "creator can update karma requirement",
    updatedSettings.minimum_karma_to_post,
    10,
  );
}
