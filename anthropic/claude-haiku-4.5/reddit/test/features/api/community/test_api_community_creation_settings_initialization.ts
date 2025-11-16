import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_settings_initialization(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: "",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Create a category for the community
  const categoryBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Setup: Create member for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberCreateBody = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(member);

  // Main test: Create community and verify default settings initialization
  const communityBody = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // Verify community was created with correct basic properties
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityBody.identifier,
  );
  TestValidator.equals(
    "community name matches",
    community.name,
    communityBody.name,
  );
  TestValidator.equals(
    "community visibility matches",
    community.visibility,
    communityBody.visibility,
  );
  TestValidator.equals(
    "community creator is the authenticated member",
    community.creator.id,
    member.id,
  );

  // Verify category was assigned correctly
  TestValidator.equals(
    "community category slug matches",
    community.category.slug,
    category.slug,
  );

  // Verify initial subscriber count includes the creator
  TestValidator.predicate(
    "initial subscriber count is 1",
    community.subscriber_count === 1,
  );

  // Verify default post and comment restrictions
  TestValidator.equals(
    "post creation restriction is open_to_all",
    community.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    community.post_type_restriction,
    "all_types",
  );

  // Verify timestamps were set
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof community.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof community.updated_at === "string",
  );

  // Verify community starts with zero posts and comments
  TestValidator.equals("initial post count is 0", community.post_count, 0);
  TestValidator.equals(
    "initial comment count is 0",
    community.comment_count,
    0,
  );

  // Verify soft-delete is not set for new community
  TestValidator.predicate(
    "deleted_at is not set for new community",
    community.deleted_at === null || community.deleted_at === undefined,
  );
}
