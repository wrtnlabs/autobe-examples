import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(10);
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName: string = RandomGenerator.name(2);

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authorizedModerator);

  // 2. Create first category
  const categoryName1: string = "Technology Discussion";
  const categorySlug1: string = "technology-discussion";
  const displayOrder1: number = 6;

  const category1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName1,
          slug: categorySlug1,
          display_order: displayOrder1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  TestValidator.equals(
    "first category name should match input",
    category1.name,
    categoryName1,
  );
  TestValidator.equals(
    "first category slug should match input",
    category1.slug,
    categorySlug1,
  );
  TestValidator.equals(
    "first category display_order should match input",
    category1.display_order,
    displayOrder1,
  );
  TestValidator.equals(
    "first category is_active should be true",
    category1.is_active,
    true,
  );
  TestValidator.equals(
    "first category article_count should be initialized to 0",
    category1.article_count,
    0,
  );

  // 3. Create second category with different properties
  const categoryName2: string = "Politics Discussion";
  const categorySlug2: string = "politics-discussion";
  const displayOrder2: number = 7;
  const categoryDescription2: string =
    "Discuss political topics and current events";

  const category2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName2,
          slug: categorySlug2,
          display_order: displayOrder2,
          is_active: true,
          description: categoryDescription2,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  TestValidator.equals(
    "second category name should match input",
    category2.name,
    categoryName2,
  );
  TestValidator.equals(
    "second category slug should match input",
    category2.slug,
    categorySlug2,
  );
  TestValidator.equals(
    "second category display_order should match input",
    category2.display_order,
    displayOrder2,
  );
  TestValidator.equals(
    "second category is_active should be true",
    category2.is_active,
    true,
  );
  TestValidator.equals(
    "second category description should match input",
    category2.description,
    categoryDescription2,
  );
  TestValidator.equals(
    "second category article_count should be initialized to 0",
    category2.article_count,
    0,
  );

  // 4. Create third category to test multiple creations
  const categoryName3: string = "Economic Policy";
  const categorySlug3: string = "economic-policy";
  const displayOrder3: number = 8;

  const category3: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName3,
          slug: categorySlug3,
          display_order: displayOrder3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category3);

  TestValidator.equals(
    "third category name should match input",
    category3.name,
    categoryName3,
  );
  TestValidator.equals(
    "third category slug should match input",
    category3.slug,
    categorySlug3,
  );
  TestValidator.equals(
    "third category article_count should be initialized to 0",
    category3.article_count,
    0,
  );

  // 5. Verify all categories have unique ids
  TestValidator.notEquals(
    "first and second categories should have different ids",
    category1.id,
    category2.id,
  );
  TestValidator.notEquals(
    "second and third categories should have different ids",
    category2.id,
    category3.id,
  );
  TestValidator.notEquals(
    "first and third categories should have different ids",
    category1.id,
    category3.id,
  );
}
