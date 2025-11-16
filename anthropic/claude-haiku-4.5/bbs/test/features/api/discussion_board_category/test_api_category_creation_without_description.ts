import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_creation_without_description(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category without providing description (optional field)
  const categoryName = RandomGenerator.paragraph({ sentences: 1 });
  const categorySlug = RandomGenerator.alphabets(10);

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate category was created successfully with correct values
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display order matches input",
    createdCategory.display_order,
    1,
  );
  TestValidator.predicate(
    "category is_active flag is true",
    createdCategory.is_active === true,
  );

  // Step 4: Validate description field is properly handled as null/undefined when not provided
  TestValidator.predicate(
    "description field is null or undefined when omitted",
    createdCategory.description === null ||
      createdCategory.description === undefined,
  );

  // Step 5: Validate system-managed fields are properly initialized
  TestValidator.equals(
    "article count initialized to zero",
    createdCategory.article_count,
    0,
  );
}
