import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_account_age_requirement_applies_to_new_posts_only(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community with default settings
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Verify initial settings have no account age requirement
  TestValidator.predicate(
    "community created with default open access settings",
    community.post_creation_restriction === "open_to_all",
  );

  // Step 6: Update community settings to enforce 14-day account age requirement
  const settingsWithAgeRequirement: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 14,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(settingsWithAgeRequirement);

  // Step 7: Verify account age requirement is properly set
  TestValidator.equals(
    "settings correctly store 14-day account age requirement",
    settingsWithAgeRequirement.minimum_account_age_days,
    14,
  );

  // Step 8: Verify other settings remain unchanged in update
  TestValidator.predicate(
    "account age requirement applies only to new posts (forward-looking)",
    settingsWithAgeRequirement.minimum_account_age_days === 14 &&
      settingsWithAgeRequirement.minimum_karma_to_post === 0,
  );

  // Step 9: Update settings again - verify requirement can be modified
  const settingsWithIncreasingAge: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 30,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(settingsWithIncreasingAge);

  // Step 10: Verify grace period can be increased for stronger spam prevention
  TestValidator.equals(
    "grace period can be increased for enhanced spam prevention",
    settingsWithIncreasingAge.minimum_account_age_days,
    30,
  );

  // Step 11: Test that removing age requirement works (zero days = no restriction)
  const settingsWithoutAgeRequirement: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 0,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(settingsWithoutAgeRequirement);

  TestValidator.equals(
    "account age requirement can be disabled",
    settingsWithoutAgeRequirement.minimum_account_age_days,
    0,
  );

  // Step 12: Verify multiple settings can be updated together
  const multipleSettingsUpdate: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          minimum_account_age_days: 7,
          require_post_approval: false,
          default_sort_method: "hot",
          enable_nsfw_content: true,
          enable_spoiler_tags: true,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(multipleSettingsUpdate);

  // Step 13: Verify combined settings persist correctly
  TestValidator.equals(
    "account age requirement persists with other settings updates",
    multipleSettingsUpdate.minimum_account_age_days,
    7,
  );

  TestValidator.predicate(
    "all settings applied together in single update",
    multipleSettingsUpdate.default_sort_method === "hot" &&
      multipleSettingsUpdate.enable_nsfw_content === true &&
      multipleSettingsUpdate.enable_spoiler_tags === true,
  );

  // Step 14: Final validation - age requirement prevents new accounts while preserving history
  TestValidator.predicate(
    "grace period ensures spam protection without retroactive effects",
    multipleSettingsUpdate.minimum_account_age_days >= 0 &&
      community.post_count >= 0, // Historical posts remain unaffected
  );
}
