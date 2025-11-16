import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_with_optional_description(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account for setup
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a category using administrator authentication
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
    description: "Technology and software development discussions",
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a community with optional description
  const communityDescription =
    "A community for tech enthusiasts to discuss latest developments in software, hardware, and innovation";

  const communityData = {
    name: "Tech Enthusiasts",
    identifier: "tech_enthusiasts",
    description: communityDescription,
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

  // Step 5: Validate that the description is included in the response
  TestValidator.equals(
    "community description should match input description",
    community.description,
    communityDescription,
  );

  // Step 6: Validate other community properties
  TestValidator.equals(
    "community name should match",
    community.name,
    "Tech Enthusiasts",
  );

  TestValidator.equals(
    "community identifier should match",
    community.identifier,
    "tech_enthusiasts",
  );

  TestValidator.equals(
    "community visibility should be public",
    community.visibility,
    "public",
  );

  TestValidator.equals(
    "community post creation restriction should be open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );

  TestValidator.equals(
    "community post type restriction should be all_types",
    community.post_type_restriction,
    "all_types",
  );

  TestValidator.equals(
    "community category slug should match",
    community.category.slug,
    category.slug,
  );

  TestValidator.equals(
    "community creator should be the authenticated member",
    community.creator.id,
    member.id,
  );

  TestValidator.predicate(
    "community should have subscriber count of at least 1",
    community.subscriber_count >= 1,
  );

  TestValidator.predicate(
    "community should have valid creation timestamp",
    community.created_at !== null && community.created_at !== undefined,
  );
}
