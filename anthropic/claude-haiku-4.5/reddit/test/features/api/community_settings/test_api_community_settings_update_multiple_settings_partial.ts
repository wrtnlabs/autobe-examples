import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_update_multiple_settings_partial(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    href: "https://example.com",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    { body: memberData },
  );
  typia.assert(authenticatedMember);

  // 2. Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    href: "https://example.com",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Create category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // 3. Create community
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(10).toLowerCase(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 4. Update settings with partial data
  const updateData = {
    require_post_approval: true,
    minimum_karma_to_post: 25,
    enable_spoiler_tags: true,
  } satisfies ICommunityPlatformCommunitySettings.IUpdate;

  const updatedSettings =
    await api.functional.communityPlatform.member.communities.settings.update(
      connection,
      {
        communityId: community.id,
        body: updateData,
      },
    );
  typia.assert(updatedSettings);

  // 5. Validate updated fields
  TestValidator.equals(
    "require_post_approval should be true",
    updatedSettings.require_post_approval,
    true,
  );
  TestValidator.equals(
    "minimum_karma_to_post should be 25",
    updatedSettings.minimum_karma_to_post,
    25,
  );
  TestValidator.equals(
    "enable_spoiler_tags should be true",
    updatedSettings.enable_spoiler_tags,
    true,
  );

  // 6. Validate non-updated fields retain default values
  TestValidator.equals(
    "require_comment_approval should retain default (false)",
    updatedSettings.require_comment_approval,
    false,
  );
  TestValidator.equals(
    "minimum_account_age_days should retain default (0)",
    updatedSettings.minimum_account_age_days,
    0,
  );
  TestValidator.predicate(
    "default_sort_method should be one of valid values",
    ["hot", "new", "top", "controversial"].includes(
      updatedSettings.default_sort_method,
    ),
  );
  TestValidator.equals(
    "archive_posts_after_days should retain default (0)",
    updatedSettings.archive_posts_after_days,
    0,
  );
  TestValidator.equals(
    "enable_nsfw_content should retain default (false)",
    updatedSettings.enable_nsfw_content,
    false,
  );

  // 7. Verify community_id is correct
  TestValidator.equals(
    "settings community_id should match created community",
    updatedSettings.community_id,
    community.id,
  );

  // 8. Verify timestamps are set
  TestValidator.predicate(
    "created_at should be a valid date",
    !isNaN(new Date(updatedSettings.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !isNaN(new Date(updatedSettings.updated_at).getTime()),
  );
}
