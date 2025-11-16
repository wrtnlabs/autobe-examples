import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article update without proper moderator authentication.
 *
 * Validates that attempting to update an article without valid authentication
 * credentials results in a 401 Unauthorized error. This test ensures the API
 * properly enforces authentication requirements on protected endpoints.
 *
 * Test flow:
 *
 * 1. Create a moderator account to establish valid authentication context
 * 2. Attempt to update an article with an unauthenticated connection
 * 3. Verify the API rejects the request with 401 Unauthorized error
 * 4. Confirm authentication is enforced before business logic execution
 */
export async function test_api_article_update_without_authentication(
  connection: api.IConnection,
) {
  // 1. Create a moderator account (dependency setup)
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create an unauthenticated connection (empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt to update an article without authentication
  // Using a random articleId to test the authentication enforcement
  await TestValidator.httpError(
    "should reject article update without authentication",
    401,
    async () => {
      return await api.functional.discussionBoard.moderator.articles.update(
        unauthConn,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
