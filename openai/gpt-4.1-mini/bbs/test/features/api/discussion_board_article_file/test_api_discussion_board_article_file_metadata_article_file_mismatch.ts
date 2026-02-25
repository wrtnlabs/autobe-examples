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

export async function test_api_discussion_board_article_file_metadata_article_file_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authenticate
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "test1234",
      },
    },
  );
  typia.assert(authorizedUser);
  registeredUserConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create first article
  const firstArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: { sectionId: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(firstArticle);
  // 3. Create second article
  const secondArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: { sectionId: typia.random<string & tags.Format<"uuid">>() } },
    );
  typia.assert(secondArticle);
  // 4. Attach a file to the first article
  const attachedFile =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      registeredUserConnection,
      { params: { articleId: firstArticle.id } },
    );
  typia.assert(attachedFile);
  // 5. Attempt to retrieve the file metadata for the mismatched article ID with first article's file ID
  await TestValidator.httpError(
    "should error when retrieving file metadata with mismatched article ID",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.atFile(
        registeredUserConnection,
        { articleId: secondArticle.id, fileId: attachedFile.id },
      );
    },
  );
}
