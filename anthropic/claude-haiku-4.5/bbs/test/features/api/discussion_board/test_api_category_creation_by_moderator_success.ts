import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_category_creation_by_moderator_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();

  const moderatorJoinResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorJoinResponse);

  // Verify moderator registration returned authorization tokens
  TestValidator.predicate(
    "moderator registration should return access token",
    moderatorJoinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator registration should return refresh token",
    moderatorJoinResponse.token.refresh.length > 0,
  );
  TestValidator.equals(
    "moderator summary display name matches registration",
    moderatorJoinResponse.moderator.display_name,
    moderatorDisplayName,
  );
  TestValidator.equals(
    "moderator account status should be active",
    moderatorJoinResponse.moderator.account_status,
    "active",
  );

  // Step 2: Create a discussion board category with moderator
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 2,
    wordMax: 5,
  });
  const categorySlug = RandomGenerator.alphaNumeric(10);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const categoryDisplayOrder = 1;
  const categoryIsActive = true;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: categoryDisplayOrder,
          is_active: categoryIsActive,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Verify category creation response
  TestValidator.predicate(
    "created category should have valid id assigned",
    createdCategory.id.length > 0,
  );
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
    "category description should match request",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category display order should match request",
    createdCategory.display_order,
    categoryDisplayOrder,
  );
  TestValidator.equals(
    "category is_active should match request",
    createdCategory.is_active,
    categoryIsActive,
  );
  TestValidator.equals(
    "category article_count should be initialized to 0",
    createdCategory.article_count,
    0,
  );
  TestValidator.predicate(
    "created_at and updated_at should be set",
    createdCategory.created_at.length > 0 &&
      createdCategory.updated_at.length > 0,
  );
}
