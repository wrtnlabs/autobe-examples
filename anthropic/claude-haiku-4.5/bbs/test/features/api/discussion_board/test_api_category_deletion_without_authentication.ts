import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category deletion without proper moderator authentication.
 *
 * Validates that the category deletion endpoint
 * (/discussionBoard/moderator/categories/{categoryId}) requires valid moderator
 * authentication credentials. Attempts to delete a category without providing
 * valid authentication tokens should be rejected with a 401 Unauthorized
 * error.
 *
 * This test ensures that critical moderation operations are protected from
 * unauthorized access and can only be performed by authenticated moderators.
 *
 * Test flow:
 *
 * 1. Create a moderator account to establish authenticated context (demonstrates
 *    auth system works)
 * 2. Create an unauthenticated connection by removing the authorization header
 * 3. Attempt to delete a category using the unauthenticated connection
 * 4. Verify deletion fails with 401 Unauthorized error, confirming authentication
 *    is enforced
 */
export async function test_api_category_deletion_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to establish authenticated context
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authentication works",
    moderator.token !== null && moderator.token !== undefined,
  );

  // Step 2: Create an unauthenticated connection by removing the authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to delete a category using the unauthenticated connection
  // and verify deletion fails with 401 Unauthorized error
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "category deletion should fail without authentication",
    401,
    async () => {
      await api.functional.discussionBoard.moderator.categories.erase(
        unauthenticatedConnection,
        {
          categoryId: categoryId,
        },
      );
    },
  );
}
