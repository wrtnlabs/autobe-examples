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
 * Test the complete workflow of a moderator creating an article and then
 * attaching an image to it.
 *
 * This scenario validates:
 *
 * 1. Member authentication via join to establish a new member user context
 * 2. Article creation by member to establish the parent resource
 * 3. Moderator authentication via join to establish moderator context
 * 4. Image attachment creation by moderator with complete metadata
 * 5. Verification that moderators can attach images to any article (not just their
 *    own)
 * 6. Validation that the image is properly associated with the member's article
 * 7. Testing moderator's ability to enrich member content with visual supporting
 *    materials
 *
 * This represents the moderation workflow where moderators assist members by
 * adding appropriate visual content to enhance discussion quality.
 */
export async function test_api_article_image_attachment_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Member joins the platform
  const memberJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  // Step 2: Member creates an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Validate article was created by the member
  TestValidator.equals(
    "article author ID matches member ID",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article body matches input",
    article.body,
    articleData.body,
  );

  // Step 3: Moderator joins the platform
  const moderatorJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderator);

  // Step 4: Moderator attaches an image to the member's article
  const imageData = {
    original_filename: `${RandomGenerator.alphabets(8)}.png`,
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
    content_type: "image/png",
    storage_url: typia.random<string & tags.Format<"uri">>(),
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >(),
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >(),
  } satisfies IDiscussionBoardArticleImage.ICreate;

  const image: IDiscussionBoardArticleImage =
    await api.functional.discussionBoard.moderator.articles.images.create(
      connection,
      {
        articleId: article.id,
        body: imageData,
      },
    );
  typia.assert(image);

  // Step 5: Validate image attachment
  TestValidator.equals(
    "image article ID matches",
    image.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "image filename matches input",
    image.original_filename,
    imageData.original_filename,
  );
  TestValidator.equals(
    "image file size matches input",
    image.file_size,
    imageData.file_size,
  );
  TestValidator.equals(
    "image content type matches input",
    image.content_type,
    imageData.content_type,
  );
  TestValidator.equals(
    "image storage URL matches input",
    image.storage_url,
    imageData.storage_url,
  );
  TestValidator.equals(
    "image width matches input",
    image.width,
    imageData.width,
  );
  TestValidator.equals(
    "image height matches input",
    image.height,
    imageData.height,
  );
  TestValidator.predicate(
    "image has valid UUID",
    typeof image.id === "string" && image.id.length > 0,
  );
  TestValidator.predicate(
    "image created_at is valid",
    typeof image.created_at === "string",
  );
}
