import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_images_create } from "../../../generate/generate_random_discussion_board_user_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_metadata_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Create an article for attaching files
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create an image attachment for the article
  const initialImage =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          alt_text: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 5,
          }),
          caption: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(initialImage);
  // Update the file metadata
  const updateData = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 5,
    }),
    caption: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.user.articles.files.patchByArticleid(
      userConnection,
      {
        articleId: article.id,
        body: updateData,
      },
    );
  typia.assert(updatedFile);
  // Validate the metadata changes
  TestValidator.equals(
    "display order updated",
    updatedFile.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "alt text updated",
    updatedFile.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals(
    "caption updated",
    updatedFile.caption,
    updateData.caption,
  );
  // Verify the file attachment reference remains the same
  TestValidator.equals(
    "file ID unchanged",
    updatedFile.attachment_file.id,
    initialImage.attachment_file.id,
  );
  // Verify the article reference is correct
  TestValidator.equals(
    "article ID unchanged",
    updatedFile.article.id,
    article.id,
  );
}
