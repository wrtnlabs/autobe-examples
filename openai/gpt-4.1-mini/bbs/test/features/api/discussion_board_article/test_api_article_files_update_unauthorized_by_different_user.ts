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

export async function test_api_article_files_update_unauthorized_by_different_user(
  connection: api.IConnection,
): Promise<void> {
  // User A registration and authentication
  const userAConnection: api.IConnection = { host: connection.host };
  const userAJoinResult = await authorize_registered_user_join(
    userAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  userAConnection.headers = {
    Authorization: userAJoinResult.token.access,
  };
  // Create an article owned by user A
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userAConnection,
      {},
    );
  typia.assert(article);
  // User B registration and authentication
  const userBConnection: api.IConnection = { host: connection.host };
  const userBJoinResult = await authorize_registered_user_join(
    userBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  userBConnection.headers = {
    Authorization: userBJoinResult.token.access,
  };
  // Prepare file update payload with valid fields
  const updateBody = {
    fileName: `updated_${RandomGenerator.alphabets(8)}.txt`,
    fileType: "text/plain",
    fileSize: 1024,
    downloadUrl: "https://example.com/updatedfile.txt",
    displayOrder: 1,
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  // User B attempts to update User A's article files
  await TestValidator.httpError(
    "403 Forbidden when different user tries to update article files",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.updateFiles(
        userBConnection,
        {
          articleId: article.id,
          body: updateBody,
        },
      );
    },
  );
  // Verify that article files remain unchanged by fetching article details
  // by user A and confirm update did not occur
  // As the problem does not provide a GET detail endpoint, we approximate
  // by checking original article's files unchanged (cannot directly verify here),
  // so the main test is the 403 error enforcement.
}
