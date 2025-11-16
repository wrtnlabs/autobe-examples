import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test creating community with non-existent category slug.
 *
 * Verifies that the community creation endpoint properly validates the
 * category_slug parameter. When a member attempts to create a community
 * referencing a category slug that does not exist in the system, the API should
 * reject the request with an appropriate error response (HTTP 400 or 404),
 * indicating that the category must reference an existing active category in
 * the community_platform_categories table.
 *
 * Test flow:
 *
 * 1. Create and authenticate a member account
 * 2. Attempt to create a community with a non-existent category slug
 * 3. Verify that the API returns an error indicating category not found
 * 4. Confirm the system validates category existence before creation
 */
export async function test_api_community_creation_nonexistent_category(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Attempt to create a community with non-existent category slug
  const nonexistentCategorySlug =
    "nonexistent_category_" + RandomGenerator.alphaNumeric(8);

  const communityCreationData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: nonexistentCategorySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  // Step 3: Verify that the API returns an error for non-existent category
  await TestValidator.error(
    "community creation should fail with non-existent category slug",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: communityCreationData,
        },
      );
    },
  );
}
