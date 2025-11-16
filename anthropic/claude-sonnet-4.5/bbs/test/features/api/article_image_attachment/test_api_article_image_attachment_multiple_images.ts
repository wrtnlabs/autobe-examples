import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test attaching multiple images to a single article.
 *
 * This test validates the capability to enrich discussion board articles with
 * multiple supporting visual materials. Members can attach various image
 * formats (JPEG, PNG, GIF, WebP) to their economic and political discussion
 * articles, enabling comprehensive visual documentation of arguments and
 * references.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a member
 * 2. Create a discussion board article
 * 3. Attach multiple images with different formats to the article
 * 4. Validate each image is correctly created and linked to the article
 * 5. Verify metadata integrity for all images
 */
export async function test_api_article_image_attachment_multiple_images(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
    username: RandomGenerator.name(),
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attach first image (JPEG format)
  const image1Data = {
    original_filename: "economic_chart.jpg",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/jpeg",
    storage_url:
      "https://cdn.example.com/images/economic_chart_" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image1: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: image1Data,
      },
    );
  typia.assert(image1);
  TestValidator.equals(
    "image1 linked to article",
    image1.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image1 filename preserved",
    image1.original_filename,
    image1Data.original_filename,
  );
  TestValidator.equals(
    "image1 content type",
    image1.content_type,
    "image/jpeg",
  );

  // Step 4: Attach second image (PNG format)
  const image2Data = {
    original_filename: "political_infographic.png",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/png",
    storage_url:
      "https://cdn.example.com/images/political_infographic_" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image2: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: image2Data,
      },
    );
  typia.assert(image2);
  TestValidator.equals(
    "image2 linked to article",
    image2.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image2 filename preserved",
    image2.original_filename,
    image2Data.original_filename,
  );
  TestValidator.equals("image2 content type", image2.content_type, "image/png");

  // Step 5: Attach third image (GIF format)
  const image3Data = {
    original_filename: "market_trends.gif",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/gif",
    storage_url:
      "https://cdn.example.com/images/market_trends_" +
      RandomGenerator.alphaNumeric(16) +
      ".gif",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image3: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: image3Data,
      },
    );
  typia.assert(image3);
  TestValidator.equals(
    "image3 linked to article",
    image3.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image3 filename preserved",
    image3.original_filename,
    image3Data.original_filename,
  );
  TestValidator.equals("image3 content type", image3.content_type, "image/gif");

  // Step 6: Attach fourth image (WebP format)
  const image4Data = {
    original_filename: "policy_comparison.webp",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/webp",
    storage_url:
      "https://cdn.example.com/images/policy_comparison_" +
      RandomGenerator.alphaNumeric(16) +
      ".webp",
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<4000>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image4: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.member.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: image4Data,
      },
    );
  typia.assert(image4);
  TestValidator.equals(
    "image4 linked to article",
    image4.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image4 filename preserved",
    image4.original_filename,
    image4Data.original_filename,
  );
  TestValidator.equals(
    "image4 content type",
    image4.content_type,
    "image/webp",
  );

  // Step 7: Verify all images have unique IDs
  const imageIds = [image1.id, image2.id, image3.id, image4.id];
  const uniqueIds = new Set(imageIds);
  TestValidator.equals("all images have unique IDs", uniqueIds.size, 4);

  // Step 8: Verify all images are linked to the same article
  TestValidator.predicate(
    "all images linked to same article",
    imageIds.every(() => true) &&
      image1.discussion_board_article_id === article.id &&
      image2.discussion_board_article_id === article.id &&
      image3.discussion_board_article_id === article.id &&
      image4.discussion_board_article_id === article.id,
  );
}
