import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that newly created categories initialize article_count to 0.
 *
 * Moderators should be able to create new discussion board categories, and all
 * newly created categories must have their article_count property initialized
 * to 0. This ensures engagement metrics start at zero and can properly track
 * articles as they are published in the category.
 *
 * Test Process:
 *
 * 1. Authenticate as moderator using join endpoint
 * 2. Create a new discussion board category with valid data
 * 3. Validate response shows article_count=0
 * 4. Confirm all category properties are correctly initialized
 */
export async function test_api_category_creation_article_count_initialization(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword: string = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  });

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new discussion board category
  const categoryName: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 5,
  });
  const categorySlug: string = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const categoryDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const displayOrder: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: displayOrder,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate that article_count is initialized to 0
  TestValidator.equals(
    "article_count should be initialized to 0",
    createdCategory.article_count,
    0,
  );

  // Step 4: Confirm all category properties are correctly set
  TestValidator.equals(
    "category name should match request",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug should match request",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order should match request",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "category should be active",
    createdCategory.is_active === true,
  );
  TestValidator.predicate(
    "category id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );
  TestValidator.predicate(
    "created_at should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.created_at),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.updated_at),
  );
}
