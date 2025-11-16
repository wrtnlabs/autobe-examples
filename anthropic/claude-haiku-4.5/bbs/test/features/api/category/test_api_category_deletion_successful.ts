import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_deletion_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for authentication
  const moderatorCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    password: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderatorAuth);

  // Step 2: Create a new discussion board category
  const categoryCreate = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 1, wordMax: 3 }),
    slug: RandomGenerator.alphabets(10),
    display_order: 1,
    is_active: true,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryCreate.name,
  );
  TestValidator.equals(
    "created category slug matches input",
    createdCategory.slug,
    categoryCreate.slug,
  );
  TestValidator.equals(
    "created category is active",
    createdCategory.is_active,
    true,
  );

  // Step 3: Delete the created category
  await api.functional.discussionBoard.moderator.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  TestValidator.predicate("category deletion completed without error", true);
}
