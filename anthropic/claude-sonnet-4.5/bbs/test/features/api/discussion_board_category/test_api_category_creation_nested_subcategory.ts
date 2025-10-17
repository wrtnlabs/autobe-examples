import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

export async function test_api_category_creation_nested_subcategory(
  connection: api.IConnection,
) {
  // 1. Administrator registers and authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuth);

  // 2. Administrator creates a parent category
  const parentCategoryData = {
    name: "Economics",
    slug: "economics",
    description: "Discussions about economic theories and policies",
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const parentCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: parentCategoryData,
      },
    );
  typia.assert(parentCategory);

  // 3. Administrator creates a subcategory under the parent
  const subcategoryData = {
    name: "Macroeconomics",
    slug: "macroeconomics",
    description:
      "Study of economy-wide phenomena including inflation, GDP, and unemployment",
    parent_category_id: parentCategory.id,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const subcategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: subcategoryData,
      },
    );
  typia.assert(subcategory);

  // 4. Verify the subcategory has correct parent relationship
  TestValidator.equals(
    "subcategory parent_category_id matches parent category id",
    subcategory.parent_category_id,
    parentCategory.id,
  );

  // 5. Validate category metadata
  TestValidator.equals(
    "subcategory name is correct",
    subcategory.name,
    "Macroeconomics",
  );

  TestValidator.equals(
    "subcategory slug is correct",
    subcategory.slug,
    "macroeconomics",
  );

  TestValidator.equals(
    "parent category has null parent_category_id",
    parentCategory.parent_category_id,
    null,
  );

  TestValidator.predicate(
    "parent category is active",
    parentCategory.is_active,
  );

  TestValidator.predicate("subcategory is active", subcategory.is_active);

  TestValidator.equals(
    "parent category initial topic count is 0",
    parentCategory.topic_count,
    0,
  );

  TestValidator.equals(
    "subcategory initial topic count is 0",
    subcategory.topic_count,
    0,
  );
}
