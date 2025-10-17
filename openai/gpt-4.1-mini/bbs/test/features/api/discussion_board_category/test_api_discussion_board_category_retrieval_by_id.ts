import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategories";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";

export async function test_api_discussion_board_category_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication prerequisite for admin privileged actions)
  const adminDisplayName: string = RandomGenerator.name();
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongpassword123", // Password with adequate complexity
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create discussion board category
  //    Must include name and optional description
  const categoryName = RandomGenerator.name(2); // Two words for category name
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const createBody = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "created category description matches",
    category.description ?? null,
    categoryDescription ?? null,
  );
  TestValidator.predicate(
    "created category has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.predicate(
    "created_at timestamp is ISO 8601",
    typeof category.created_at === "string" && category.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at timestamp is ISO 8601",
    typeof category.updated_at === "string" && category.updated_at.length >= 20,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    category.deleted_at ?? null,
    null,
  );

  // 3. Retrieve the created category by ID
  const getCategory: IDiscussionBoardDiscussionBoardCategories =
    await api.functional.discussionBoard.discussionBoardCategories.at(
      connection,
      {
        discussionBoardCategoryId: category.id,
      },
    );
  typia.assert(getCategory);

  // 4. Validate that retrieved data matches created category
  TestValidator.equals(
    "retrieved category id equals created id",
    getCategory.id,
    category.id,
  );
  TestValidator.equals(
    "retrieved category name equals created name",
    getCategory.name,
    category.name,
  );
  TestValidator.equals(
    "retrieved category description equals created description",
    getCategory.description ?? null,
    category.description ?? null,
  );
  TestValidator.equals(
    "retrieved created_at equals created created_at",
    getCategory.created_at,
    category.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at equals created updated_at",
    getCategory.updated_at,
    category.updated_at,
  );
  TestValidator.equals(
    "retrieved deleted_at matches created deleted_at",
    getCategory.deleted_at ?? null,
    category.deleted_at ?? null,
  );
}
