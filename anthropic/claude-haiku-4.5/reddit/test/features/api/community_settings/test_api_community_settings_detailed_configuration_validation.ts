import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySettings";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_settings_detailed_configuration_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category as administrator
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Switch to member authentication and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Retrieve community settings and validate all fields
  const settings: ICommunityPlatformCommunitySettings =
    await api.functional.communityPlatform.communities.settings.at(connection, {
      communityId: community.id,
    });
  typia.assert(settings);

  // Validate settings structure and expected defaults
  TestValidator.equals(
    "settings community_id matches created community",
    settings.community_id,
    community.id,
  );

  TestValidator.equals(
    "require_post_approval defaults to false",
    settings.require_post_approval,
    false,
  );

  TestValidator.equals(
    "require_comment_approval defaults to false",
    settings.require_comment_approval,
    false,
  );

  TestValidator.equals(
    "minimum_karma_to_post defaults to 0",
    settings.minimum_karma_to_post,
    0,
  );

  TestValidator.equals(
    "minimum_account_age_days defaults to 0",
    settings.minimum_account_age_days,
    0,
  );

  TestValidator.equals(
    "default_sort_method defaults to hot",
    settings.default_sort_method,
    "hot",
  );

  TestValidator.equals(
    "archive_posts_after_days defaults to 0",
    settings.archive_posts_after_days,
    0,
  );

  TestValidator.equals(
    "enable_nsfw_content defaults to false",
    settings.enable_nsfw_content,
    false,
  );

  TestValidator.equals(
    "enable_spoiler_tags defaults to true",
    settings.enable_spoiler_tags,
    true,
  );

  // Validate timestamps are present and properly formatted
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(settings.created_at)),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(settings.updated_at)),
  );

  // Validate that settings ID is properly formatted UUID
  TestValidator.predicate(
    "settings ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      settings.id,
    ),
  );

  // Validate that integer constraints are within valid ranges
  TestValidator.predicate(
    "minimum_karma_to_post is non-negative",
    settings.minimum_karma_to_post >= 0,
  );

  TestValidator.predicate(
    "minimum_account_age_days is non-negative",
    settings.minimum_account_age_days >= 0,
  );

  TestValidator.predicate(
    "archive_posts_after_days is non-negative",
    settings.archive_posts_after_days >= 0,
  );

  // Validate enum values
  const validSortMethods = ["hot", "new", "top", "controversial"] as const;
  TestValidator.predicate(
    "default_sort_method is valid enum value",
    validSortMethods.includes(settings.default_sort_method),
  );
}
