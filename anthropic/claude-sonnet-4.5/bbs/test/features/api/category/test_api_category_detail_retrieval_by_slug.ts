import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving detailed information about a specific category using its
 * URL-friendly slug identifier.
 *
 * This test validates the category detail viewing workflow for content
 * discovery. The test first creates a moderator account with proper
 * permissions, then creates a category with a specific name and slug through
 * the moderator category creation endpoint to establish test data. Finally, it
 * retrieves the category details using the slug parameter in the URL path.
 *
 * The test validates that the response contains complete category information
 * including:
 *
 * 1. Display name matching the created category
 * 2. Detailed description
 * 3. The exact slug used in the request
 * 4. Creation timestamp
 * 5. Last update timestamp
 *
 * All fields are verified to match the IDiscussionBoardCategory type
 * definition, ensuring that slug-based retrieval provides SEO-friendly URLs for
 * category browsing.
 */
export async function test_api_category_detail_retrieval_by_slug(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to enable category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorData = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a category with specific slug to test retrieval
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });

  const categoryData = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Retrieve category details using the slug parameter
  const retrievedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categorySlug: createdCategory.slug,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate that retrieved category matches created category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "creation timestamp matches",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "update timestamp matches",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );

  // Step 5: Verify the slug used in request matches the retrieved category slug
  TestValidator.equals(
    "slug in request matches retrieved slug",
    createdCategory.slug,
    retrievedCategory.slug,
  );
}
