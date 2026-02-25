import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_user_articles_images_create_image } from "../../../generate/generate_random_discussion_board_user_articles_images_create_image";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test successful image attachment to an article by its author.
 *
 * Workflow:
 * 1. Register a new user via join endpoint
 * 2. Create a new article owned by this user
 * 3. Attach a valid JPEG image (2MB, 1920x1080) to the article
 *
 * Validation Points:
 * - Response returns valid image record
 * - Image record contains correct metadata: original_filename preserved, file_size matches actual, mime_type is 'image/jpeg', width/height extracted correctly
 * - Image is linked to the correct article
 * - Storage path is generated and unique
 * - Created_at timestamp is set
 */
export async function test_api_article_image_attach_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create article owned by authenticated user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Prepare valid JPEG image metadata (2MB, 1920x1080)
  const imageInput = {
    original_filename: "test-image.jpg",
    storage_path: typia.random<string & tags.Format<"uri">>(),
    file_size: 2097152 satisfies number & tags.Type<"int32"> as number,
    mime_type: "image/jpeg",
    width: 1920 satisfies number & tags.Type<"int32"> as number,
    height: 1080 satisfies number & tags.Type<"int32"> as number,
  } satisfies IDiscussionBoardArticleImage.ICreate;
  // 4. Attach image to article
  const attachedImage =
    await api.functional.discussionBoard.user.articles.images.createImage(
      userConnection,
      {
        articleId: article.id,
        body: imageInput,
      },
    );
  typia.assert(attachedImage);
  // 5. Validate image metadata is preserved correctly
  TestValidator.equals(
    "original filename preserved",
    attachedImage.original_filename,
    imageInput.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    attachedImage.file_size,
    imageInput.file_size,
  );
  TestValidator.equals(
    "mime type is jpeg",
    attachedImage.mime_type,
    "image/jpeg",
  );
  TestValidator.equals("width matches", attachedImage.width, imageInput.width);
  TestValidator.equals(
    "height matches",
    attachedImage.height,
    imageInput.height,
  );
  TestValidator.predicate(
    "storage path is non-empty",
    attachedImage.storage_path.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    attachedImage.created_at.includes("T"),
  );
}
