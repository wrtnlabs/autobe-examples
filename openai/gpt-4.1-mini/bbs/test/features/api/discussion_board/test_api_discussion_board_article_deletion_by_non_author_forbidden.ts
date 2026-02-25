import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_article_deletion_by_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Forbidden article deletion attempt by a registered user who is not the article's author.
  // 1. Auth as first registered user (article creator)
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_registered_user_join(firstUserConnection, {
    body: {
      email: `firstuser_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "strong-password-1234",
    },
  });
  typia.assert(firstUser);
  // 2. First user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      firstUserConnection,
      {},
    );
  typia.assert(article);
  // 3. Auth as second registered user (non-author)
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_registered_user_join(
    secondUserConnection,
    {
      body: {
        email: `seconduser_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "strong-password-4567",
      },
    },
  );
  typia.assert(secondUser);
  // 4. Attempt to delete the article by second user (non-author), expect authorization error
  await TestValidator.httpError(
    "Article deletion forbidden for non-author registered user",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.erase(
        secondUserConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
  // 5. Verify article still exists by fetching (simulate fetch by trying to delete again and expect 403 again or simply no error). Since no API to get article is listed, we trust it is still intact if deletion forbidden.
}
