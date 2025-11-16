import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful creation of a community with all required and optional
 * fields.
 *
 * This comprehensive test validates the complete community creation workflow:
 *
 * 1. Registers an administrator and creates a category for classification
 * 2. Registers a member who will become the community creator
 * 3. Creates a community with all fields including name, identifier, description,
 *    visibility setting (public), post creation restriction, and post type
 *    restriction
 * 4. Validates that all provided fields are stored correctly and returned in
 *    response
 * 5. Verifies the creator is properly assigned from the authenticated member
 * 6. Confirms initial community metrics are correctly set (subscriber_count=1,
 *    post_count=0, comment_count=0)
 * 7. Verifies category and creator relationships are properly transformed to
 *    .ISummary objects
 * 8. Confirms all timestamps (created_at, updated_at) are properly set and have
 *    valid ISO 8601 format
 */
export async function test_api_community_creation_successful_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(15),
    name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(adminResponse);

  // Switch to admin connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: adminResponse.token.access,
    },
  };

  // Create category
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const categoryCreateBody = {
    name: RandomGenerator.name(2),
    slug: categorySlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // Step 2: Create member who will be the community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const memberCreateBody = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphabets(15),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberResponse);

  // Switch to member connection
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberResponse.token.access,
    },
  };

  // Step 3: Create community with all fields
  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const communityName = RandomGenerator.name(3);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });

  const communityCreateBody = {
    name: communityName,
    identifier: communityIdentifier,
    description: communityDescription,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Step 4: Validate all fields are stored correctly
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community identifier matches",
    createdCommunity.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description,
    communityDescription,
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

  // Step 5: Verify creator is properly assigned
  TestValidator.equals(
    "creator ID matches member",
    createdCommunity.creator.id,
    memberResponse.id,
  );
  TestValidator.equals(
    "creator email matches",
    createdCommunity.creator.email,
    memberEmail,
  );
  TestValidator.equals(
    "creator username matches",
    createdCommunity.creator.username,
    memberCreateBody.username,
  );

  // Step 6: Verify initial community metrics
  TestValidator.equals(
    "subscriber count initialized to 1",
    createdCommunity.subscriber_count,
    1,
  );
  TestValidator.equals(
    "post count initialized to 0",
    createdCommunity.post_count,
    0,
  );
  TestValidator.equals(
    "comment count initialized to 0",
    createdCommunity.comment_count,
    0,
  );

  // Step 7: Verify category relationship
  TestValidator.equals(
    "category ID matches",
    createdCommunity.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    createdCommunity.category.name,
    category.name,
  );
  TestValidator.equals(
    "category slug matches",
    createdCommunity.category.slug,
    category.slug,
  );

  // Step 8: Verify timestamps
  TestValidator.predicate("created_at is valid ISO date-time", () => {
    const date = new Date(createdCommunity.created_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate("updated_at is valid ISO date-time", () => {
    const date = new Date(createdCommunity.updated_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate(
    "deleted_at is null",
    () =>
      createdCommunity.deleted_at === null ||
      createdCommunity.deleted_at === undefined,
  );
}
