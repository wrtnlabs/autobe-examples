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
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_discussion_board_registered_user_article_file_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to update a file attached to an article by a user who does not own the article (unauthorized user). The operation must be rejected with a 403 Forbidden error. Use two registered users: one creates the article and uploads the file, the other attempts the update to verify access control enforcement.
  // 1. Register and authorize first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_registered_user_join(firstUserConnection, {
    body: {
      email: `user1_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password1",
    },
  });
  // 2. First user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      firstUserConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. First user uploads a file to the article
  const file =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      firstUserConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(file);
  // 4. Register and authorize second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_registered_user_join(
    secondUserConnection,
    {
      body: {
        email: `user2_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "password2",
      },
    },
  );
  // 5. Second user attempts to update the first user's article file - expect 403 Forbidden
  await TestValidator.httpError(
    "update article file by unauthorized user",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.update(
        secondUserConnection,
        {
          articleId: article.id,
          fileId: file.id,
          body: {
            fileName: "unauthorized-update.pdf",
          },
        },
      );
    },
  );
}
