import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category details are publicly accessible without authentication.
 *
 * This test validates the platform's transparent content organization strategy
 * by ensuring that discussion board categories can be retrieved by any user
 * type including unauthenticated guests. Categories form the primary taxonomy
 * for organizing economic and political discussion topics and must support open
 * content discovery.
 *
 * Test Flow:
 *
 * 1. Create moderator account with administrative capabilities
 * 2. Moderator creates a test category with complete metadata
 * 3. Create unauthenticated connection (no authentication headers)
 * 4. Retrieve category details using the category slug without authentication
 * 5. Validate complete category information is returned
 * 6. Confirm no authentication was required
 */
export async function test_api_category_detail_public_accessibility(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to enable category creation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a test category with complete metadata
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Validate category creation succeeded with expected data
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category description matches",
    createdCategory.description,
    categoryData.description,
  );
  TestValidator.predicate(
    "category has valid ID",
    createdCategory.id !== null && createdCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category has valid slug",
    createdCategory.slug !== null &&
      createdCategory.slug !== undefined &&
      createdCategory.slug.length > 0,
  );

  // Step 3: Create unauthenticated connection (no authentication headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve category details without authentication using the slug
  const publicCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(unauthConnection, {
      categorySlug: createdCategory.slug,
    });
  typia.assert(publicCategory);

  // Step 5: Validate complete category information is returned
  TestValidator.equals(
    "public category ID matches",
    publicCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "public category name matches",
    publicCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "public category description matches",
    publicCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "public category slug matches",
    publicCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "public category created_at matches",
    publicCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "public category updated_at matches",
    publicCategory.updated_at,
    createdCategory.updated_at,
  );

  // Step 6: Confirm that all category fields are accessible without authentication
  TestValidator.predicate(
    "category details fully accessible to guests",
    publicCategory.name === categoryData.name &&
      publicCategory.description === categoryData.description,
  );
}
