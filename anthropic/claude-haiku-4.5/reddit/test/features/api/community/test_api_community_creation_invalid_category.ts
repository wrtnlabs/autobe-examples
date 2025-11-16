import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that community creation fails when referencing a non-existent category.
 *
 * This test validates that the API properly enforces foreign key constraints
 * when creating a community. The scenario attempts to create a community with a
 * category_slug that does not exist in the system, which should result in a
 * validation error. The test ensures that invalid category references are
 * rejected at creation time.
 *
 * Test flow:
 *
 * 1. Authenticate as a member (create a new member account)
 * 2. Attempt to create a community with a non-existent category slug
 * 3. Verify that the creation fails with an appropriate error
 * 4. Confirm that no community was created with invalid category
 */
export async function test_api_community_creation_invalid_category(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to create a community with a non-existent category slug
  const invalidCategorySlug =
    "non_existent_category_" + RandomGenerator.alphaNumeric(8);

  await TestValidator.error(
    "community creation should fail with invalid category",
    async () => {
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 3 }),
            identifier: "test_community_" + RandomGenerator.alphaNumeric(8),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            visibility: "public",
            post_creation_restriction: "open_to_all",
            post_type_restriction: "all_types",
            category_slug: invalidCategorySlug,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    },
  );
}
