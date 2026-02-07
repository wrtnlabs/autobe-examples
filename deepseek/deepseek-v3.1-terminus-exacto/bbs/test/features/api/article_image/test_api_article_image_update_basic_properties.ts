import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageFile";
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
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_update_basic_properties(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: The test scenario requires creating an article with a valid section_id
  // However, since we don't have section creation utilities available,
  // we'll need to use the SDK directly with a valid section ID
  // For this test, we'll assume there's at least one active section available
  // Create an article for image attachment
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This may fail if section doesn't exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Upload initial image with minimal properties
  // Note: The attachment_file_id should reference an existing file
  // Since we don't have file upload utilities, we'll use a random UUID
  // This may fail if file validation is strict
  const initialImage =
    await api.functional.discussionBoard.user.articles.images.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: null,
          caption: null,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // Update image properties with new alt_text and caption
  const updateBody = {
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleImage.IUpdate;
  const updatedImage =
    await api.functional.discussionBoard.user.articles.images.update(
      userConnection,
      {
        articleId: article.id,
        imageId: initialImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // Validate that the update succeeded
  TestValidator.equals(
    "image ID remains unchanged",
    updatedImage.id,
    initialImage.id,
  );
  TestValidator.equals(
    "file reference remains unchanged",
    updatedImage.file.id,
    initialImage.file.id,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedImage.status,
    initialImage.status,
  );
  TestValidator.equals(
    "display order remains unchanged",
    updatedImage.display_order,
    initialImage.display_order,
  );
  TestValidator.equals(
    "article reference remains unchanged",
    updatedImage.article.id,
    initialImage.article.id,
  );
  // Validate that the updated properties are correctly set
  TestValidator.equals(
    "alt_text is updated",
    updatedImage.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "caption is updated",
    updatedImage.caption,
    updateBody.caption,
  );
  // Validate that the original null values are now properly updated
  TestValidator.notEquals(
    "alt_text changed from null",
    updatedImage.alt_text,
    null,
  );
  TestValidator.notEquals(
    "caption changed from null",
    updatedImage.caption,
    null,
  );
}
