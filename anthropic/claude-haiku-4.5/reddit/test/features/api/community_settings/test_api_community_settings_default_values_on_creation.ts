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
 * Test that community settings contain correct default values when community is
 * first created.
 *
 * This test validates that when a member creates a community without explicitly
 * configuring settings, the system applies documented default values correctly.
 * The test verifies all default setting values match their documented
 * specifications:
 *
 * - Require_post_approval: false (posts appear immediately)
 * - Require_comment_approval: false (comments appear immediately)
 * - Minimum_karma_to_post: 0 (no karma barrier to post)
 * - Minimum_account_age_days: 0 (no account age requirement)
 * - Default_sort_method: 'hot' (trending discussion sorting)
 * - Archive_posts_after_days: 0 (no automatic post archival)
 * - Enable_nsfw_content: false (NSFW content disabled by default)
 * - Enable_spoiler_tags: true (spoiler tags enabled by default)
 *
 * This test ensures the default settings are properly initialized at community
 * creation time and can be retrieved accurately through the settings API
 * endpoint.
 *
 * Workflow:
 *
 * 1. Create administrator account for category creation
 * 2. Create a community category that will be required for community creation
 * 3. Create a member account who will be the community creator
 * 4. Create a new community with only required fields (relying on defaults)
 * 5. Retrieve the community's settings using the settings GET endpoint
 * 6. Validate all settings match the documented default values exactly
 * 7. Verify no unexpected or additional defaults are applied
 */
export async function test_api_community_settings_default_values_on_creation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Switch to administrator and create a category required for community creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to be the community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a new community with only required fields
  const communityName = RandomGenerator.name(2);
  const communityIdentifier = RandomGenerator.alphaNumeric(8);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Retrieve the community's settings using the GET endpoint
  const settings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(connection, {
      communityId: community.id,
    });
  typia.assert(settings);

  // Step 6: Validate all default settings match documented values
  TestValidator.equals(
    "post approval disabled by default",
    settings.require_post_approval,
    false,
  );

  TestValidator.equals(
    "comment approval disabled by default",
    settings.require_comment_approval,
    false,
  );

  TestValidator.equals(
    "minimum karma to post is zero by default",
    settings.minimum_karma_to_post,
    0,
  );

  TestValidator.equals(
    "minimum account age is zero by default",
    settings.minimum_account_age_days,
    0,
  );

  TestValidator.equals(
    "default sort method is hot",
    settings.default_sort_method,
    "hot",
  );

  TestValidator.equals(
    "post archival disabled by default",
    settings.archive_posts_after_days,
    0,
  );

  TestValidator.equals(
    "NSFW content disabled by default",
    settings.enable_nsfw_content,
    false,
  );

  TestValidator.equals(
    "spoiler tags enabled by default",
    settings.enable_spoiler_tags,
    true,
  );

  // Step 7: Verify settings belong to the created community
  TestValidator.equals(
    "settings belong to created community",
    settings.community_id,
    community.id,
  );
}
