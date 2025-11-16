import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_image_attachment_without_dimensions(
  connection: api.IConnection,
) {
  // Step 1: Member Authentication - Create and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123";
  const memberUsername = RandomGenerator.name(2);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Article Creation - Create parent article for image attachment
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Image Attachment Creation Without Dimensions
  const imageFilename = `test_image_${RandomGenerator.alphaNumeric(8)}.png`;
  const imageFileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();
  const imageContentType = "image/png";
  const imageStorageUrl = typia.random<string & tags.Format<"uri">>();

  const imageAttachment: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: imageFilename,
          file_size: imageFileSize,
          content_type: imageContentType,
          storage_url: imageStorageUrl,
          width: null,
          height: null,
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(imageAttachment);

  // Step 4: Validation - Verify image was created with null dimensions
  TestValidator.equals(
    "image has correct article reference",
    imageAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image filename matches input",
    imageAttachment.original_filename,
    imageFilename,
  );
  TestValidator.equals(
    "image file size matches input",
    imageAttachment.file_size,
    imageFileSize,
  );
  TestValidator.equals(
    "image content type matches input",
    imageAttachment.content_type,
    imageContentType,
  );
  TestValidator.equals(
    "image storage URL matches input",
    imageAttachment.storage_url,
    imageStorageUrl,
  );
  TestValidator.equals(
    "image width is null as expected",
    imageAttachment.width,
    null,
  );
  TestValidator.equals(
    "image height is null as expected",
    imageAttachment.height,
    null,
  );
  TestValidator.predicate(
    "image has valid UUID",
    typeof imageAttachment.id === "string" && imageAttachment.id.length > 0,
  );
}
