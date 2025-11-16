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
 * Test moderator's ability to add multiple supporting images to member
 * articles.
 *
 * This scenario validates the complete content curation workflow where
 * moderators enhance community content quality by adding relevant charts, data
 * visualizations, or reference images to member discussions.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Member creates an article for discussion
 * 3. Create and authenticate a moderator account
 * 4. Moderator adds multiple high-quality images to enhance the article
 * 5. Verify all images are properly attached with complete metadata
 */
export async function test_api_article_image_moderator_content_enrichment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";

  const memberCreateData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(member);

  // Step 2: Member creates an article for discussion
  const articleCreateData = {
    title: "Economic Analysis: Impact of Monetary Policy on Inflation",
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleCreateData,
    },
  );
  typia.assert(article);

  TestValidator.equals(
    "article title matches",
    article.title,
    articleCreateData.title,
  );
  TestValidator.equals(
    "article author is member",
    article.author.id,
    member.id,
  );

  // Step 3: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";

  const moderatorCreateData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: RandomGenerator.name(2),
    ip: "192.168.1.200",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateData,
  });
  typia.assert(moderator);

  // Step 4: Moderator adds multiple high-quality images to enhance the article
  const imageCount = 3;
  const addedImages = await ArrayUtil.asyncRepeat(imageCount, async (index) => {
    const imageCreateData = {
      original_filename: `chart_${index + 1}.png`,
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >() satisfies number as number,
      content_type: "image/png",
      storage_url: typia.random<string & tags.Format<"uri">>(),
      width: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >() satisfies number as number,
      height: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >() satisfies number as number,
    } satisfies IDiscussionBoardArticleImage.ICreate;

    const image =
      await api.functional.discussionBoard.moderator.articles.images.create(
        connection,
        {
          articleId: article.id,
          body: imageCreateData,
        },
      );
    typia.assert(image);

    return { imageCreateData, image };
  });

  // Step 5: Verify all images are properly attached with complete metadata
  TestValidator.equals(
    "correct number of images added",
    addedImages.length,
    imageCount,
  );

  await ArrayUtil.asyncForEach(
    addedImages,
    async ({ imageCreateData, image }) => {
      // Verify image is linked to the correct article
      TestValidator.equals(
        "image linked to article",
        image.discussion_board_article_id,
        article.id,
      );

      // Verify all image metadata matches
      TestValidator.equals(
        "original filename matches",
        image.original_filename,
        imageCreateData.original_filename,
      );
      TestValidator.equals(
        "file size matches",
        image.file_size,
        imageCreateData.file_size,
      );
      TestValidator.equals(
        "content type matches",
        image.content_type,
        imageCreateData.content_type,
      );
      TestValidator.equals(
        "storage URL matches",
        image.storage_url,
        imageCreateData.storage_url,
      );

      // Verify dimensions are properly stored
      const imageWidth = typia.assert(image.width!);
      const imageHeight = typia.assert(image.height!);
      TestValidator.equals("width matches", imageWidth, imageCreateData.width);
      TestValidator.equals(
        "height matches",
        imageHeight,
        imageCreateData.height,
      );

      // Verify creation timestamp exists
      TestValidator.predicate(
        "creation timestamp exists",
        image.created_at.length > 0,
      );

      // Verify image is not soft-deleted
      TestValidator.equals("image not deleted", image.deleted_at, null);
    },
  );
}
