import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that updating an article without proper authentication is rejected.
 *
 * This test verifies that the API properly enforces authentication requirements
 * for article update operations. The test attempts to update an article without
 * providing an authorization token in the connection headers. The API should
 * reject this request with a 401 Unauthorized error, confirming that
 * authentication is required and properly enforced for contributor article
 * updates.
 *
 * Steps:
 *
 * 1. Register a new contributor account to establish authenticated context
 * 2. Create an unauthenticated connection without authorization token
 * 3. Attempt to update an article using the unauthenticated connection
 * 4. Verify that the API returns 401 Unauthorized error
 */
export async function test_api_article_contributor_update_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account to establish authenticated context
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an unauthenticated connection without authorization token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3 & 4: Attempt to update an article without authentication and verify 401 error
  await TestValidator.httpError(
    "updating article without authentication should return 401 Unauthorized",
    401,
    async () => {
      return await api.functional.discussionBoard.contributor.articles.update(
        unauthenticatedConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
