import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_public_read_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const categoryData = {
    name: "Technology",
    slug: RandomGenerator.alphabets(5).toLowerCase(),
    description: "Technology and software development discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a public community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    identifier: RandomGenerator.alphabets(6).toLowerCase(),
    description:
      "A public community for testing settings visibility without authentication",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
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

  // Step 5: Create unauthenticated guest connection
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 6: Retrieve community settings using unauthenticated guest connection
  const settings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(
      guestConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(settings);

  // Step 7: Validate settings response contains all expected fields
  TestValidator.equals(
    "settings community_id matches created community",
    settings.community_id,
    community.id,
  );

  TestValidator.predicate(
    "settings contain moderation configuration",
    typeof settings.require_post_approval === "boolean" &&
      typeof settings.require_comment_approval === "boolean",
  );

  TestValidator.predicate(
    "settings contain member access restrictions",
    typeof settings.minimum_karma_to_post === "number" &&
      typeof settings.minimum_account_age_days === "number",
  );

  TestValidator.predicate(
    "settings contain display preferences",
    ["hot", "new", "top", "controversial"].includes(
      settings.default_sort_method,
    ) && typeof settings.archive_posts_after_days === "number",
  );

  TestValidator.predicate(
    "settings contain content policy flags",
    typeof settings.enable_nsfw_content === "boolean" &&
      typeof settings.enable_spoiler_tags === "boolean",
  );

  TestValidator.predicate(
    "settings have valid timestamps",
    typeof settings.created_at === "string" &&
      typeof settings.updated_at === "string",
  );

  TestValidator.predicate(
    "public community settings are accessible to unauthenticated users",
    settings.id !== undefined &&
      settings.community_id !== undefined &&
      settings.created_at !== undefined &&
      settings.updated_at !== undefined,
  );
}
