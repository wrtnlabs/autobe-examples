import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with name at maximum boundary (exactly 255
 * characters).
 *
 * Validates that the system accepts category names at the maximum allowed
 * length of 255 characters without truncation. This boundary test ensures:
 *
 * 1. Moderator authentication through join endpoint
 * 2. Category creation with exactly 255-character name
 * 3. Response contains the full-length name without truncation
 * 4. System properly validates the 255-character maximum constraint
 *
 * This test covers the critical boundary condition where name length equals the
 * maximum constraint, ensuring the API correctly handles and validates
 * maximum-length inputs.
 */
export async function test_api_category_creation_maximum_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator for category creation
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create maximum-length category name (exactly 255 characters)
  const maximumName: string = RandomGenerator.alphabets(255);
  TestValidator.equals(
    "name length equals 255 characters",
    maximumName.length,
    255,
  );

  // Step 3: Create category with maximum-length name
  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: maximumName,
          slug: RandomGenerator.alphaNumeric(20),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Verify that the created category name is exactly as provided without truncation
  TestValidator.equals(
    "created category name matches maximum-length input",
    createdCategory.name,
    maximumName,
  );

  // Step 5: Verify the name length is preserved at maximum boundary
  TestValidator.equals(
    "created category name length equals 255 characters",
    createdCategory.name.length,
    255,
  );
}
