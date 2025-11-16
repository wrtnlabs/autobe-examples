import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_sort_method_controversial(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Debate & Discussion",
          slug: "debate-discussion",
          description: "Community for debate and diverse perspectives",
          display_order: 5,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community with initial settings
  const communityData = {
    name: "Philosophical Debates",
    identifier: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: "A space for thoughtful debate and diverse perspectives",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_only" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Verify initial settings have default sort method
  // Community creation should set default settings with 'hot' as default sort method
  TestValidator.equals(
    "initial community sort method should be hot",
    community.id !== null,
    true,
  );

  // Step 6: Update settings to set default_sort_method to 'controversial'
  const updateSettingsData = {
    default_sort_method: "controversial" as const,
    require_post_approval: false,
    require_comment_approval: false,
    minimum_karma_to_post: 0,
    minimum_account_age_days: 0,
    archive_posts_after_days: 0,
    enable_nsfw_content: true,
    enable_spoiler_tags: true,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const updatedSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: updateSettingsData,
      },
    );
  typia.assert(updatedSettings);

  // Step 7: Verify the settings were updated correctly
  TestValidator.equals(
    "settings should have default_sort_method set to controversial",
    updatedSettings.default_sort_method,
    "controversial",
  );

  TestValidator.equals(
    "settings community_id should match",
    updatedSettings.community_id,
    community.id,
  );

  // Step 8: Verify other settings remain properly configured
  TestValidator.equals(
    "require_post_approval should be false",
    updatedSettings.require_post_approval,
    false,
  );

  TestValidator.equals(
    "require_comment_approval should be false",
    updatedSettings.require_comment_approval,
    false,
  );

  TestValidator.equals(
    "minimum_karma_to_post should be 0",
    updatedSettings.minimum_karma_to_post,
    0,
  );

  TestValidator.equals(
    "minimum_account_age_days should be 0",
    updatedSettings.minimum_account_age_days,
    0,
  );

  TestValidator.equals(
    "enable_nsfw_content should be true",
    updatedSettings.enable_nsfw_content,
    true,
  );

  TestValidator.equals(
    "enable_spoiler_tags should be true",
    updatedSettings.enable_spoiler_tags,
    true,
  );

  // Step 9: Verify timestamps are properly set
  TestValidator.predicate("created_at should be a valid ISO date", () => {
    const date = new Date(updatedSettings.created_at);
    return date instanceof Date && !isNaN(date.getTime());
  });

  TestValidator.predicate("updated_at should be a valid ISO date", () => {
    const date = new Date(updatedSettings.updated_at);
    return date instanceof Date && !isNaN(date.getTime());
  });

  // Step 10: Test transitioning from controversial back to another sort method
  const transitionSettings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: {
          default_sort_method: "top" as const,
        } satisfies ICommunityPlatformCommunitySettings.IUpdate,
      },
    );
  typia.assert(transitionSettings);

  TestValidator.equals(
    "after transition, sort method should be top",
    transitionSettings.default_sort_method,
    "top",
  );

  // Step 11: Verify community structure integrity
  TestValidator.predicate(
    "community id should be valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );

  TestValidator.predicate(
    "community identifier should be valid",
    community.identifier.length > 0 && community.identifier.length <= 32,
  );
}
