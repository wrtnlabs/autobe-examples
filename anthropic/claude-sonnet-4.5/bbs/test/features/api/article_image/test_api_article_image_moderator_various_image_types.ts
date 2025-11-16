import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator attaching different types of visual content to articles.
 *
 * This scenario validates:
 *
 * 1. Member authentication and article creation about economic topics
 * 2. Moderator authentication
 * 3. Moderator adding diverse image types: economic charts (image/png), political
 *    diagrams (image/jpeg), data visualizations (image/webp)
 * 4. Verification that different content types are properly handled
 * 5. Testing images with and without dimension metadata
 * 6. Validation that storage URLs are properly preserved for CDN delivery
 *
 * This ensures moderators can effectively use all supported image formats to
 * provide comprehensive visual context for economic and political discussions.
 */
export async function test_api_article_image_moderator_various_image_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.name(),
    ip: "192.168.1.100",
    href: "https://discussion-board.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Member creates an article about economic topics
  const articleData = {
    title: "Economic Policy Impact on Modern Markets",
    body: "This article discusses the comprehensive analysis of economic policies and their impact on global markets. The article explores various economic indicators, political decisions, and their correlation with market performance.",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article title matches",
    article.title,
    articleData.title,
  );
  TestValidator.equals("article body matches", article.body, articleData.body);

  // Step 3: Create and authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";

  const moderatorData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.name(),
    ip: "192.168.1.101",
    href: "https://discussion-board.example.com/moderator/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://discussion-board.example.com" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 4: Moderator adds PNG image with dimensions (economic chart)
  const pngImageData = {
    original_filename: "economic_chart_2024.png",
    file_size: 245678 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    content_type: "image/png",
    storage_url:
      "https://cdn.discussion-board.example.com/images/economic_chart_2024.png" satisfies string &
        tags.Format<"uri">,
    width: 1920 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    height: 1080 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const pngImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: pngImageData,
      },
    );
  typia.assert(pngImage);
  TestValidator.equals(
    "PNG image filename matches",
    pngImage.original_filename,
    pngImageData.original_filename,
  );
  TestValidator.equals(
    "PNG image content type",
    pngImage.content_type,
    "image/png",
  );
  TestValidator.equals(
    "PNG image storage URL matches",
    pngImage.storage_url,
    pngImageData.storage_url,
  );
  TestValidator.equals(
    "PNG image width matches",
    pngImage.width,
    pngImageData.width,
  );
  TestValidator.equals(
    "PNG image height matches",
    pngImage.height,
    pngImageData.height,
  );
  TestValidator.equals(
    "PNG image article ID matches",
    pngImage.discussion_board_article_id,
    article.id,
  );

  // Step 5: Moderator adds JPEG image with dimensions (political diagram)
  const jpegImageData = {
    original_filename: "political_diagram_governance.jpg",
    file_size: 512340 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    content_type: "image/jpeg",
    storage_url:
      "https://cdn.discussion-board.example.com/images/political_diagram_governance.jpg" satisfies string &
        tags.Format<"uri">,
    width: 2560 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    height: 1440 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const jpegImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: jpegImageData,
      },
    );
  typia.assert(jpegImage);
  TestValidator.equals(
    "JPEG image filename matches",
    jpegImage.original_filename,
    jpegImageData.original_filename,
  );
  TestValidator.equals(
    "JPEG image content type",
    jpegImage.content_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "JPEG image storage URL matches",
    jpegImage.storage_url,
    jpegImageData.storage_url,
  );
  TestValidator.equals(
    "JPEG image width matches",
    jpegImage.width,
    jpegImageData.width,
  );
  TestValidator.equals(
    "JPEG image height matches",
    jpegImage.height,
    jpegImageData.height,
  );
  TestValidator.equals(
    "JPEG image article ID matches",
    jpegImage.discussion_board_article_id,
    article.id,
  );

  // Step 6: Moderator adds WebP image without dimensions (data visualization)
  const webpImageData = {
    original_filename: "data_visualization_trends.webp",
    file_size: 189234 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    content_type: "image/webp",
    storage_url:
      "https://cdn.discussion-board.example.com/images/data_visualization_trends.webp" satisfies string &
        tags.Format<"uri">,
    width: null,
    height: null,
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const webpImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: webpImageData,
      },
    );
  typia.assert(webpImage);
  TestValidator.equals(
    "WebP image filename matches",
    webpImage.original_filename,
    webpImageData.original_filename,
  );
  TestValidator.equals(
    "WebP image content type",
    webpImage.content_type,
    "image/webp",
  );
  TestValidator.equals(
    "WebP image storage URL matches",
    webpImage.storage_url,
    webpImageData.storage_url,
  );
  TestValidator.equals("WebP image width is null", webpImage.width, null);
  TestValidator.equals("WebP image height is null", webpImage.height, null);
  TestValidator.equals(
    "WebP image article ID matches",
    webpImage.discussion_board_article_id,
    article.id,
  );

  // Step 7: Verify all images have proper metadata
  TestValidator.predicate("PNG image has valid ID", pngImage.id.length > 0);
  TestValidator.predicate("JPEG image has valid ID", jpegImage.id.length > 0);
  TestValidator.predicate("WebP image has valid ID", webpImage.id.length > 0);

  TestValidator.predicate(
    "PNG image file size is positive",
    pngImage.file_size > 0,
  );
  TestValidator.predicate(
    "JPEG image file size is positive",
    jpegImage.file_size > 0,
  );
  TestValidator.predicate(
    "WebP image file size is positive",
    webpImage.file_size > 0,
  );
}
