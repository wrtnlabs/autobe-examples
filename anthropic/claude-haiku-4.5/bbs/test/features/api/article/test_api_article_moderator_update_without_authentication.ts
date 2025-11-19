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

export async function test_api_article_moderator_update_without_authentication(
  connection: api.IConnection,
) {
  // First, create a moderator account to establish context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ValidPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create an unauthenticated connection by removing the authorization header
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to update an article without authentication
  // Using a random UUID for the article ID since we're testing auth failure
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();

  // Test that the API rejects the update without valid authentication
  await TestValidator.error(
    "moderator article update should fail without authentication",
    async () => {
      await api.functional.discussionBoard.moderator.articles.updateByModerator(
        unauthConn,
        {
          articleId: randomArticleId,
          body: {
            status: "published",
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
