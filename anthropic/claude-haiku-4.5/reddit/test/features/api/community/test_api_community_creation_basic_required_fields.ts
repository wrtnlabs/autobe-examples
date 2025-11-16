import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_creation_basic_required_fields(
  connection: api.IConnection,
) {
  // Setup: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminJoinResponse);

  // Create a category that the community will reference
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const createdCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Setup: Create member account to be the community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoinResponse);

  // Test: Create a community with only required fields
  const communityName = "Technology Discussions";
  const communityIdentifier = "tech_discussions";

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          identifier: communityIdentifier,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: createdCategory.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Validation: Verify community response structure
  TestValidator.equals(
    "community name matches input",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community identifier matches input",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility is public",
    createdCommunity.visibility,
    "public",
  );
  TestValidator.equals(
    "post creation restriction is open_to_all",
    createdCommunity.post_creation_restriction,
    "open_to_all",
  );
  TestValidator.equals(
    "post type restriction is all_types",
    createdCommunity.post_type_restriction,
    "all_types",
  );

  // Validation: Verify auto-generated fields
  TestValidator.predicate(
    "community has auto-generated id",
    typia.is<string & tags.Format<"uuid">>(createdCommunity.id),
  );
  TestValidator.equals(
    "initial subscriber count is 1 (creator)",
    createdCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "initial post count is 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "initial comment count is 0",
    createdCommunity.comment_count,
    0,
  );

  // Validation: Verify creator information is set to authenticated member
  TestValidator.equals(
    "creator id matches authenticated member",
    createdCommunity.creator.id,
    memberJoinResponse.id,
  );
  TestValidator.predicate(
    "creator has valid username",
    typeof createdCommunity.creator.username === "string" &&
      createdCommunity.creator.username.length > 0,
  );
  TestValidator.predicate(
    "creator has valid email",
    typia.is<string & tags.Format<"email">>(createdCommunity.creator.email),
  );
  TestValidator.predicate(
    "creator account is active",
    createdCommunity.creator.account_status === "active",
  );
  TestValidator.predicate(
    "creator karma score is non-negative",
    createdCommunity.creator.karma_score >= 0,
  );

  // Validation: Verify category reference
  TestValidator.equals(
    "category slug matches created category",
    createdCommunity.category.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "category name matches created category",
    createdCommunity.category.name,
    createdCategory.name,
  );

  // Validation: Verify timestamps exist and are valid
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    typia.is<string & tags.Format<"date-time">>(createdCommunity.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date",
    typia.is<string & tags.Format<"date-time">>(createdCommunity.updated_at),
  );
  TestValidator.predicate(
    "deleted_at is null on new community",
    createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
