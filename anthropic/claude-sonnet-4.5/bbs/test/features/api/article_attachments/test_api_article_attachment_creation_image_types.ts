import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful creation of image attachments with all supported formats.
 *
 * This test validates that the discussion board article attachment system
 * properly handles all four supported image formats (JPEG, PNG, GIF, WebP)
 * within the 5MB size limit. Each format is tested individually to ensure
 * proper acceptance, storage, and metadata generation.
 *
 * Test Flow:
 *
 * 1. Create moderator and authenticate
 * 2. Create article category (prerequisite for articles)
 * 3. Create member and authenticate (switch to member role)
 * 4. Create article to attach images to
 * 5. Test JPEG format attachment creation
 * 6. Test PNG format attachment creation
 * 7. Test GIF format attachment creation
 * 8. Test WebP format attachment creation
 * 9. Validate each attachment has complete metadata
 */
export async function test_api_article_attachment_creation_image_types(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category as moderator (required for article creation)
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policy and markets",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article and attachment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.100",
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create article to attach images to
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Test JPEG format image attachment creation
  const jpegAttachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "jpeg",
          size: 4500000,
          original_filename: "chart-economic-growth.jpeg",
          storage_path: `/attachments/articles/${article.id}/chart-economic-growth-${Date.now()}.jpeg`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(jpegAttachment);

  // Validate JPEG attachment metadata
  TestValidator.equals(
    "jpeg attachment has valid UUID",
    typeof jpegAttachment.id,
    "string",
  );
  TestValidator.equals(
    "jpeg attachment links to article",
    jpegAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "jpeg attachment links to member",
    jpegAttachment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "jpeg attachment type is image",
    jpegAttachment.type,
    "image",
  );
  TestValidator.equals(
    "jpeg attachment format is jpeg",
    jpegAttachment.format,
    "jpeg",
  );
  TestValidator.equals(
    "jpeg attachment size is correct",
    jpegAttachment.size,
    4500000,
  );
  TestValidator.equals(
    "jpeg attachment filename preserved",
    jpegAttachment.original_filename,
    "chart-economic-growth.jpeg",
  );
  TestValidator.predicate(
    "jpeg attachment has storage path",
    jpegAttachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "jpeg attachment has created_at",
    jpegAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "jpeg attachment has updated_at",
    jpegAttachment.updated_at.length > 0,
  );
  TestValidator.equals(
    "jpeg attachment is not deleted",
    jpegAttachment.deleted_at,
    null,
  );

  // Step 6: Test PNG format image attachment creation
  const pngAttachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: 3200000,
          original_filename: "transparency-diagram.png",
          storage_path: `/attachments/articles/${article.id}/transparency-diagram-${Date.now()}.png`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(pngAttachment);

  // Validate PNG attachment metadata
  TestValidator.equals(
    "png attachment has valid UUID",
    typeof pngAttachment.id,
    "string",
  );
  TestValidator.equals(
    "png attachment links to article",
    pngAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "png attachment links to member",
    pngAttachment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "png attachment type is image",
    pngAttachment.type,
    "image",
  );
  TestValidator.equals(
    "png attachment format is png",
    pngAttachment.format,
    "png",
  );
  TestValidator.equals(
    "png attachment size is correct",
    pngAttachment.size,
    3200000,
  );
  TestValidator.equals(
    "png attachment filename preserved",
    pngAttachment.original_filename,
    "transparency-diagram.png",
  );
  TestValidator.predicate(
    "png attachment has storage path",
    pngAttachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "png attachment has created_at",
    pngAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "png attachment has updated_at",
    pngAttachment.updated_at.length > 0,
  );
  TestValidator.equals(
    "png attachment is not deleted",
    pngAttachment.deleted_at,
    null,
  );

  // Step 7: Test GIF format image attachment creation
  const gifAttachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "gif",
          size: 2800000,
          original_filename: "animated-trend.gif",
          storage_path: `/attachments/articles/${article.id}/animated-trend-${Date.now()}.gif`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(gifAttachment);

  // Validate GIF attachment metadata
  TestValidator.equals(
    "gif attachment has valid UUID",
    typeof gifAttachment.id,
    "string",
  );
  TestValidator.equals(
    "gif attachment links to article",
    gifAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "gif attachment links to member",
    gifAttachment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "gif attachment type is image",
    gifAttachment.type,
    "image",
  );
  TestValidator.equals(
    "gif attachment format is gif",
    gifAttachment.format,
    "gif",
  );
  TestValidator.equals(
    "gif attachment size is correct",
    gifAttachment.size,
    2800000,
  );
  TestValidator.equals(
    "gif attachment filename preserved",
    gifAttachment.original_filename,
    "animated-trend.gif",
  );
  TestValidator.predicate(
    "gif attachment has storage path",
    gifAttachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "gif attachment has created_at",
    gifAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "gif attachment has updated_at",
    gifAttachment.updated_at.length > 0,
  );
  TestValidator.equals(
    "gif attachment is not deleted",
    gifAttachment.deleted_at,
    null,
  );

  // Step 8: Test WebP format image attachment creation
  const webpAttachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "webp",
          size: 1500000,
          original_filename: "modern-compressed.webp",
          storage_path: `/attachments/articles/${article.id}/modern-compressed-${Date.now()}.webp`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(webpAttachment);

  // Validate WebP attachment metadata
  TestValidator.equals(
    "webp attachment has valid UUID",
    typeof webpAttachment.id,
    "string",
  );
  TestValidator.equals(
    "webp attachment links to article",
    webpAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "webp attachment links to member",
    webpAttachment.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "webp attachment type is image",
    webpAttachment.type,
    "image",
  );
  TestValidator.equals(
    "webp attachment format is webp",
    webpAttachment.format,
    "webp",
  );
  TestValidator.equals(
    "webp attachment size is correct",
    webpAttachment.size,
    1500000,
  );
  TestValidator.equals(
    "webp attachment filename preserved",
    webpAttachment.original_filename,
    "modern-compressed.webp",
  );
  TestValidator.predicate(
    "webp attachment has storage path",
    webpAttachment.storage_path.length > 0,
  );
  TestValidator.predicate(
    "webp attachment has created_at",
    webpAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "webp attachment has updated_at",
    webpAttachment.updated_at.length > 0,
  );
  TestValidator.equals(
    "webp attachment is not deleted",
    webpAttachment.deleted_at,
    null,
  );
}
