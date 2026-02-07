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

/**
 * Test successful retrieval of an article image with complete metadata.
 * Creates a user account, publishes an article, uploads an image with metadata,
 * and validates that all image metadata is correctly returned via GET endpoint.
 */
export async function test_api_article_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // 2. Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // 3. Upload an image to the article
  const image =
    await generate_random_discussion_board_user_articles_images_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(image);
  // 4. Retrieve the image metadata using actor-specific connection
  const retrievedImage =
    await api.functional.discussionBoard.articles.images.at(userConnection, {
      articleId: article.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // 5. Validate all metadata fields
  TestValidator.equals("image ID matches", retrievedImage.id, image.id);
  TestValidator.equals(
    "file ID matches",
    retrievedImage.file.id,
    image.file.id,
  );
  TestValidator.equals("status is active", retrievedImage.status, "active");
  TestValidator.equals(
    "display order matches",
    retrievedImage.display_order,
    image.display_order,
  );
  TestValidator.equals(
    "alt text matches",
    retrievedImage.alt_text,
    image.alt_text,
  );
  TestValidator.equals(
    "caption matches",
    retrievedImage.caption,
    image.caption,
  );
  TestValidator.equals(
    "article ID matches",
    retrievedImage.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedImage.article.title,
    article.title,
  );
  // 6. Validate file metadata
  TestValidator.predicate(
    "filename exists",
    retrievedImage.file.filename.length > 0,
  );
  TestValidator.predicate(
    "file size is positive",
    retrievedImage.file.file_size > 0,
  );
  TestValidator.predicate(
    "mime type exists",
    retrievedImage.file.mime_type.length > 0,
  );
  TestValidator.predicate(
    "storage path exists",
    retrievedImage.file.storage_path.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp valid",
    retrievedImage.file.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp valid",
    retrievedImage.file.updated_at.length > 0,
  );
}
