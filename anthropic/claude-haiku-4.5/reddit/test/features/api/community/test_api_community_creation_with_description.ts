import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with optional description field.
 *
 * Validates that communities can be created with descriptions (0-500
 * characters) explaining the community's purpose and scope. Verifies the
 * description is correctly stored and returned in the API response. Also tests
 * community creation without description to ensure the optional field is
 * properly handled.
 *
 * Workflow:
 *
 * 1. Create administrator account for category management
 * 2. Create a category for community classification
 * 3. Create member account (future community creator)
 * 4. Create community with description
 * 5. Verify description is stored and returned correctly
 * 6. Validate description length constraints
 */
export async function test_api_community_creation_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and software development discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (will become community creator)
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    ip: "192.168.1.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create community with description
  const communityDescription =
    "A community for discussing technology trends, software development practices, and sharing knowledge about modern development tools and frameworks.";

  const communityData = {
    name: "Technology Discussion",
    identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: communityDescription,
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "text_and_images",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5: Verify description is stored correctly
  TestValidator.equals(
    "community description matches input",
    community.description,
    communityDescription,
  );

  TestValidator.equals(
    "community creator is the authenticated member",
    community.creator.id,
    member.id,
  );

  TestValidator.equals(
    "community category matches selected category",
    community.category.slug,
    category.slug,
  );

  // Step 6: Verify community was initialized with proper defaults
  TestValidator.equals(
    "initial subscriber count is 1 (creator)",
    community.subscriber_count,
    1,
  );

  TestValidator.predicate(
    "community has proper visibility setting",
    community.visibility === "public",
  );

  // Step 7: Test community creation without description (optional field)
  const communityWithoutDescData = {
    name: "General Discussion",
    identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: undefined,
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityWithoutDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityWithoutDescData,
      },
    );
  typia.assert(communityWithoutDesc);

  TestValidator.predicate(
    "community without description has null description",
    communityWithoutDesc.description === null ||
      communityWithoutDesc.description === undefined,
  );

  // Step 8: Test description length validation with maximum length
  const maxLengthDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 500);

  const communityMaxDescData = {
    name: "Another Community",
    identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: maxLengthDescription,
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityMaxDesc =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityMaxDescData,
      },
    );
  typia.assert(communityMaxDesc);

  TestValidator.predicate(
    "community description respects maximum length constraint",
    (communityMaxDesc.description?.length ?? 0) <= 500,
  );
}
