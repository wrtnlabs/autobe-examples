import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test category to be deleted
  const categoryName = RandomGenerator.name(3);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate category was created successfully
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category description matches input",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "category has valid slug",
    createdCategory.slug.length > 0,
  );

  // Step 4: Delete the category using the slug
  const deletedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.erase(
      connection,
      {
        categorySlug: createdCategory.slug,
      },
    );
  typia.assert(deletedCategory);

  // Step 5: Validate the deletion response
  TestValidator.equals(
    "deleted category ID matches created category",
    deletedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "deleted category name matches created category",
    deletedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "deleted category slug matches created category",
    deletedCategory.slug,
    createdCategory.slug,
  );
}
