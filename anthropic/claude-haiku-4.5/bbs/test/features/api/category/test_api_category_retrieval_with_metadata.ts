import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_retrieval_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple categories with varying properties
  const categories = await ArrayUtil.asyncRepeat(5, async (index) => {
    const slug = `category-${index}-${RandomGenerator.alphaNumeric(5)}`;
    const hasDescription = index % 2 === 0;

    const categoryData = {
      name: `Test Category ${index}`,
      slug: slug,
      display_order: index,
      is_active: index !== 2, // Make one category inactive
      ...(hasDescription && {
        description: `This is test category ${index} with description for testing metadata retrieval`,
      }),
    } satisfies IDiscussionBoardCategory.ICreate;

    const category: IDiscussionBoardCategory =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3 & 4: Retrieve each category and validate metadata
  await ArrayUtil.asyncForEach(categories, async (createdCategory) => {
    const retrievedCategory: IDiscussionBoardCategory =
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: createdCategory.id,
      });
    typia.assert(retrievedCategory);

    // Validate all metadata fields
    TestValidator.equals(
      "category id matches created category",
      retrievedCategory.id,
      createdCategory.id,
    );

    TestValidator.equals(
      "category name matches input",
      retrievedCategory.name,
      createdCategory.name,
    );

    TestValidator.equals(
      "category slug matches input",
      retrievedCategory.slug,
      createdCategory.slug,
    );

    TestValidator.equals(
      "category display_order matches input",
      retrievedCategory.display_order,
      createdCategory.display_order,
    );

    TestValidator.equals(
      "category is_active matches input",
      retrievedCategory.is_active,
      createdCategory.is_active,
    );

    TestValidator.equals(
      "category description matches input",
      retrievedCategory.description,
      createdCategory.description,
    );

    TestValidator.equals(
      "article_count initialized to 0 for new category",
      retrievedCategory.article_count,
      0,
    );

    // Validate timestamp formats
    TestValidator.predicate("created_at is valid ISO 8601 timestamp", () => {
      const timestamp = new Date(retrievedCategory.created_at);
      return !isNaN(timestamp.getTime());
    });

    TestValidator.predicate("updated_at is valid ISO 8601 timestamp", () => {
      const timestamp = new Date(retrievedCategory.updated_at);
      return !isNaN(timestamp.getTime());
    });

    TestValidator.predicate(
      "created_at matches original creation timestamp",
      retrievedCategory.created_at === createdCategory.created_at,
    );

    TestValidator.predicate(
      "updated_at matches original update timestamp",
      retrievedCategory.updated_at === createdCategory.updated_at,
    );
  });
}
