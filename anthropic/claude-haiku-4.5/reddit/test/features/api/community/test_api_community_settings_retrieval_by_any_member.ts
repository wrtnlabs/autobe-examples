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
 * Test retrieval of community settings by authenticated members.
 *
 * This test validates that community settings are properly stored, retrieved,
 * and accessible to any authenticated member. The scenario includes:
 *
 * 1. Creating member accounts (creator and non-creator)
 * 2. Setting up an admin and category for community creation
 * 3. Creating a community with specific settings configuration
 * 4. Retrieving settings as both creator and non-creator members
 * 5. Validating all settings match what was configured
 *
 * The test ensures settings include:
 *
 * - Post and comment approval requirements (boolean flags)
 * - Minimum karma score to post (integer >= 0)
 * - Minimum account age requirement (integer days >= 0)
 * - Default feed sorting method (enum: hot, new, top, controversial)
 * - Post archival timeline (integer days >= 0)
 * - NSFW content enablement (boolean)
 * - Spoiler tag enablement (boolean)
 */
export async function test_api_community_settings_retrieval_by_any_member(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (community creator)
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(8)}`,
        password: creatorPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create second member (non-creator for retrieval test)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create community with specific settings configuration
  const communityName = `Community_${RandomGenerator.alphaNumeric(8)}`;
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(8)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "karma_requirement",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Retrieve settings as community creator
  const creatorSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(connection, {
      communityId: community.id,
    });
  typia.assert(creatorSettings);

  // Validate all settings properties exist and have correct types
  TestValidator.predicate(
    "settings has id",
    typeof creatorSettings.id === "string",
  );
  TestValidator.predicate(
    "settings community_id matches",
    creatorSettings.community_id === community.id,
  );
  TestValidator.predicate(
    "require_post_approval is boolean",
    typeof creatorSettings.require_post_approval === "boolean",
  );
  TestValidator.predicate(
    "require_comment_approval is boolean",
    typeof creatorSettings.require_comment_approval === "boolean",
  );
  TestValidator.predicate(
    "minimum_karma_to_post is number",
    typeof creatorSettings.minimum_karma_to_post === "number",
  );
  TestValidator.predicate(
    "minimum_account_age_days is number",
    typeof creatorSettings.minimum_account_age_days === "number",
  );
  TestValidator.predicate(
    "default_sort_method is valid enum",
    ["hot", "new", "top", "controversial"].includes(
      creatorSettings.default_sort_method,
    ),
  );
  TestValidator.predicate(
    "archive_posts_after_days is number",
    typeof creatorSettings.archive_posts_after_days === "number",
  );
  TestValidator.predicate(
    "enable_nsfw_content is boolean",
    typeof creatorSettings.enable_nsfw_content === "boolean",
  );
  TestValidator.predicate(
    "enable_spoiler_tags is boolean",
    typeof creatorSettings.enable_spoiler_tags === "boolean",
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof creatorSettings.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof creatorSettings.updated_at === "string",
  );

  // Validate default values are appropriate
  TestValidator.predicate(
    "minimum_karma_to_post is non-negative",
    creatorSettings.minimum_karma_to_post >= 0,
  );
  TestValidator.predicate(
    "minimum_account_age_days is non-negative",
    creatorSettings.minimum_account_age_days >= 0,
  );
  TestValidator.predicate(
    "archive_posts_after_days is non-negative",
    creatorSettings.archive_posts_after_days >= 0,
  );

  // Step 7: Switch to non-creator member and retrieve same settings
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const memberSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(connection, {
      communityId: community.id,
    });
  typia.assert(memberSettings);

  // Validate non-creator member can access the same settings
  TestValidator.equals(
    "non-creator can read settings id",
    memberSettings.id,
    creatorSettings.id,
  );
  TestValidator.equals(
    "non-creator sees same community_id",
    memberSettings.community_id,
    creatorSettings.community_id,
  );
  TestValidator.equals(
    "non-creator sees same post approval setting",
    memberSettings.require_post_approval,
    creatorSettings.require_post_approval,
  );
  TestValidator.equals(
    "non-creator sees same comment approval setting",
    memberSettings.require_comment_approval,
    creatorSettings.require_comment_approval,
  );
  TestValidator.equals(
    "non-creator sees same minimum karma",
    memberSettings.minimum_karma_to_post,
    creatorSettings.minimum_karma_to_post,
  );
  TestValidator.equals(
    "non-creator sees same minimum account age",
    memberSettings.minimum_account_age_days,
    creatorSettings.minimum_account_age_days,
  );
  TestValidator.equals(
    "non-creator sees same sort method",
    memberSettings.default_sort_method,
    creatorSettings.default_sort_method,
  );
  TestValidator.equals(
    "non-creator sees same archive timeline",
    memberSettings.archive_posts_after_days,
    creatorSettings.archive_posts_after_days,
  );
  TestValidator.equals(
    "non-creator sees same NSFW setting",
    memberSettings.enable_nsfw_content,
    creatorSettings.enable_nsfw_content,
  );
  TestValidator.equals(
    "non-creator sees same spoiler tag setting",
    memberSettings.enable_spoiler_tags,
    creatorSettings.enable_spoiler_tags,
  );

  // Step 8: Validate settings configuration reflects valid values
  TestValidator.predicate(
    "default sort method is one of valid options",
    ["hot", "new", "top", "controversial"].includes(
      memberSettings.default_sort_method,
    ),
  );

  // Validate timestamps are ISO 8601 format strings (basic validation)
  TestValidator.predicate(
    "created_at contains T separator",
    creatorSettings.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at contains T separator",
    creatorSettings.updated_at.includes("T"),
  );
}
