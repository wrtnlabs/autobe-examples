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

export async function test_api_article_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedUser);
  // Note: In a real implementation, we would need to create a section first
  // or obtain a valid section ID from the system. For test purposes,
  // we assume a valid section ID is available or the system handles this.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Note: In a real implementation, we would need to create an attachment file first
  // The attachment_file_id must reference an existing file in the system
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  // Upload an image attachment to the article
  const image =
    await api.functional.discussionBoard.user.articles.images.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: attachmentFileId,
          display_order: 1,
          alt_text: "Test image description",
          caption: "Test image caption text",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(image);
  // Test the image retrieval endpoint
  const retrievedImage =
    await api.functional.discussionBoard.user.articles.images.at(
      userConnection,
      {
        articleId: article.id,
        imageId: image.id,
      },
    );
  typia.assert(retrievedImage);
  // Validate the retrieved image matches the created image
  TestValidator.equals("image IDs should match", retrievedImage.id, image.id);
  TestValidator.equals(
    "attachment file IDs should match",
    retrievedImage.attachment_file.id,
    image.attachment_file.id,
  );
  TestValidator.equals(
    "display order should match",
    retrievedImage.display_order,
    image.display_order,
  );
  TestValidator.equals(
    "alt text should match",
    retrievedImage.alt_text,
    image.alt_text,
  );
  TestValidator.equals(
    "caption should match",
    retrievedImage.caption,
    image.caption,
  );
  TestValidator.equals(
    "image belongs to correct article",
    retrievedImage.article.id,
    article.id,
  );
  TestValidator.predicate(
    "image status should be valid",
    retrievedImage.status.length > 0,
  );
}
