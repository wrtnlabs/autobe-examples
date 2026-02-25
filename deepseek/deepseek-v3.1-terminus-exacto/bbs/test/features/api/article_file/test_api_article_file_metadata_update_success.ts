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

export async function test_api_article_file_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(userConnection, {});
  typia.assert(joinedUser);
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
        }) satisfies string as string & tags.MinLength<5> & tags.MaxLength<200>,
        content: RandomGenerator.content({
          paragraphs: 1,
        }) satisfies string as string & tags.MinLength<50>,
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create image attachment
  const imageAttachment =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(imageAttachment);
  // Update image metadata
  const updateData: IDiscussionBoardArticleFile.IUpdate = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedImage =
    await api.functional.discussionBoard.user.articles.files.putByArticleidAndFileid(
      userConnection,
      {
        articleId: article.id,
        fileId: imageAttachment.id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);
  // Validate updates
  TestValidator.equals(
    "display_order updated",
    updatedImage.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "alt_text updated",
    updatedImage.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals(
    "caption updated",
    updatedImage.caption,
    updateData.caption,
  );
  // Validate unchanged technical properties
  TestValidator.equals("ID unchanged", updatedImage.id, imageAttachment.id);
  TestValidator.equals(
    "attachment file unchanged",
    updatedImage.attachment_file.id,
    imageAttachment.attachment_file.id,
  );
  TestValidator.equals(
    "status unchanged",
    updatedImage.status,
    imageAttachment.status,
  );
  TestValidator.equals(
    "article reference unchanged",
    updatedImage.article.id,
    imageAttachment.article.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedImage.attachment_file.created_at,
    imageAttachment.attachment_file.created_at,
  );
  // Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedImage.attachment_file.updated_at,
    imageAttachment.attachment_file.updated_at,
  );
}
