import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category creation requires moderator authentication.
 *
 * Validates that the category creation endpoint properly enforces
 * authentication requirements. Creates a moderator account, then tests various
 * authentication scenarios to ensure only authenticated moderators can create
 * categories.
 *
 * 1. Establish a moderator account through authentication
 * 2. Test that unauthenticated requests are rejected with 401 Unauthorized
 * 3. Test that requests with invalid tokens are rejected
 * 4. Verify authentication validation occurs before category creation logic
 * 5. Ensure only authenticated moderators can successfully create categories
 */
export async function test_api_category_creation_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to establish valid authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Test unauthenticated category creation (no token provided)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "category creation without authentication should fail with 401",
    401,
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        unauthenticatedConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(8),
            display_order: 1,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Test category creation with invalid/malformed authorization header
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid_token_format",
    },
  };

  await TestValidator.httpError(
    "category creation with invalid token should fail with 401",
    401,
    async () => {
      await api.functional.discussionBoard.moderator.categories.create(
        invalidTokenConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(8),
            display_order: 2,
            is_active: true,
          } satisfies IDiscussionBoardCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Test successful category creation with authenticated connection
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphabets(10),
    display_order: 3,
    is_active: true,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 5: Verify created category matches requested data
  TestValidator.equals(
    "created category name should match request",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "created category slug should match request",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "created category active status should match request",
    createdCategory.is_active,
    categoryData.is_active,
  );
  TestValidator.equals(
    "created category display order should match request",
    createdCategory.display_order,
    categoryData.display_order,
  );
  if (categoryData.description) {
    TestValidator.equals(
      "created category description should match request",
      createdCategory.description,
      categoryData.description,
    );
  }
}
