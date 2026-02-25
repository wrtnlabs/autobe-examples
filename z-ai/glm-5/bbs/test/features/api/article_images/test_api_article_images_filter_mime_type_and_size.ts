import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test filtering images by MIME type and file size range.
 * 1. Authenticate as a user via join endpoint
 * 2. Create an article with images of different formats (JPEG, PNG, WebP) and varying file sizes
 * 3. Call the images index endpoint with filter criteria: mime_type='image/jpeg' and size range
 * 4. Verify that only JPEG images within the specified size range are returned
 */
export async function test_api_article_images_filter_mime_type_and_size(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Define file sizes for test images
  const smallJpegSize = 50000; // 50KB - below range
  const mediumJpegSize = 200000; // 200KB - within range
  const largeJpegSize = 3000000; // 3MB - outside range (too large)
  const pngSize = 100000; // 100KB PNG
  const webPSize = 150000; // 150KB WebP
  // Size range for filtering (100KB to 500KB)
  const minSize = 100000;
  const maxSize = 500000;
  // 3. Create article with images of various formats and sizes
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: "Test Article for Image Filtering",
        content:
          "This article contains images of various formats and sizes for filter testing.",
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        images: [
          // JPEG images
          {
            original_filename: "small_jpeg.jpg",
            storage_path: "https://storage.example.com/images/small_jpeg.jpg",
            file_size: smallJpegSize,
            mime_type: "image/jpeg",
            width: 800,
            height: 600,
          } satisfies IDiscussionBoardArticleImage.ICreate,
          {
            original_filename: "medium_jpeg.jpg",
            storage_path: "https://storage.example.com/images/medium_jpeg.jpg",
            file_size: mediumJpegSize,
            mime_type: "image/jpeg",
            width: 1920,
            height: 1080,
          } satisfies IDiscussionBoardArticleImage.ICreate,
          {
            original_filename: "large_jpeg.jpg",
            storage_path: "https://storage.example.com/images/large_jpeg.jpg",
            file_size: largeJpegSize,
            mime_type: "image/jpeg",
            width: 4000,
            height: 3000,
          } satisfies IDiscussionBoardArticleImage.ICreate,
          // PNG image
          {
            original_filename: "test_image.png",
            storage_path: "https://storage.example.com/images/test_image.png",
            file_size: pngSize,
            mime_type: "image/png",
            width: 1024,
            height: 768,
          } satisfies IDiscussionBoardArticleImage.ICreate,
          // WebP image
          {
            original_filename: "test_image.webp",
            storage_path: "https://storage.example.com/images/test_image.webp",
            file_size: webPSize,
            mime_type: "image/webp",
            width: 1280,
            height: 720,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        ],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Query images with MIME type and size filters
  const filteredImages =
    await api.functional.discussionBoard.articles.images.index(userConnection, {
      articleId: article.id,
      body: {
        mime_type: "image/jpeg",
        min_file_size: minSize,
        max_file_size: maxSize,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(filteredImages);
  // 5. Validate results - only JPEG images within size range should be returned
  TestValidator.equals("filtered image count", filteredImages.data.length, 1);
  // Verify the returned image is the medium JPEG (within size range)
  const returnedImage = filteredImages.data[0];
  TestValidator.equals(
    "mime type is JPEG",
    returnedImage.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate(
    "file size within range",
    returnedImage.file_size >= minSize && returnedImage.file_size <= maxSize,
  );
  TestValidator.equals(
    "correct image returned",
    returnedImage.original_filename,
    "medium_jpeg.jpg",
  );
  // Verify no PNG or WebP images in results
  TestValidator.predicate(
    "no PNG images",
    !filteredImages.data.some((img) => img.mime_type === "image/png"),
  );
  TestValidator.predicate(
    "no WebP images",
    !filteredImages.data.some((img) => img.mime_type === "image/webp"),
  );
}
