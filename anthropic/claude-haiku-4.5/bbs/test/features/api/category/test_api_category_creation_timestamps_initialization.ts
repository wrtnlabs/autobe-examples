import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_creation_timestamps_initialization(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account to obtain authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new category with valid data
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Verify created_at and updated_at are equal for newly created category
  TestValidator.equals(
    "created_at should equal updated_at for newly created category",
    category.created_at,
    category.updated_at,
  );

  // Step 4: Verify other category properties are correctly initialized
  TestValidator.equals(
    "category name should match input",
    category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug should match input",
    category.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category description should match input",
    category.description,
    categoryData.description,
  );
  TestValidator.equals(
    "category display_order should match input",
    category.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "category is_active should match input",
    category.is_active,
    categoryData.is_active,
  );
  TestValidator.equals(
    "category article_count should be initialized to 0",
    category.article_count,
    0,
  );
}
