import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation without moderator authentication to validate
 * authorization enforcement.
 *
 * This test ensures that only authenticated moderators can create categories,
 * preventing unauthorized category taxonomy modifications. The test attempts to
 * create a category without providing authentication credentials and verifies
 * the API rejects the request with an appropriate authorization error.
 *
 * This confirms that the authorizationActor restriction to 'moderator' role is
 * properly enforced, protecting the category management system from
 * unauthorized access.
 *
 * Test Steps:
 *
 * 1. Create an unauthenticated connection with empty headers
 * 2. Prepare valid category creation data
 * 3. Attempt to create category without authentication
 * 4. Verify the API rejects the request with authorization error
 */
export async function test_api_category_creation_unauthorized_access(
  connection: api.IConnection,
) {
  // Create unauthenticated connection by removing any existing headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Generate slug that matches the required pattern: lowercase with hyphens
  const slugParts = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
    >(),
    () =>
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<8>
        >(),
      ),
  );
  const slug = slugParts.join("-");

  // Prepare valid category creation request body
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: slug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  // Attempt to create category without authentication - should fail
  await TestValidator.error(
    "category creation should fail without authentication",
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        unauthConnection,
        {
          body: categoryData,
        },
      );
    },
  );
}
