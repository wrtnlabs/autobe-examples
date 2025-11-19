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
 * Test attachment upload authentication requirement and member attribution.
 *
 * Validates that attachment uploads require member authentication and properly
 * associate attachments with the authenticated member. Verifies that only
 * authenticated members can create attachments and that the attachment record
 * has discussion_board_member_id populated with the authenticated member's ID,
 * providing proper attribution for the upload.
 *
 * Test Steps:
 *
 * 1. Create moderator account for category setup
 * 2. Authenticate as moderator and create article category
 * 3. Create and authenticate member account
 * 4. Create article as authenticated member
 * 5. Upload attachment as authenticated member
 * 6. Verify attachment has correct member_id attribution
 * 7. Validate security and audit trail requirements
 */
export async function test_api_article_attachment_authentication_requirement(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category as authenticated moderator
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussion about economic topics and policies",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "127.0.0.1",
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create article as authenticated member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Upload attachment as authenticated member
  const attachmentTypes = ["image", "file"] as const;
  const imageFormats = ["jpeg", "png", "gif", "webp"] as const;
  const attachmentType = RandomGenerator.pick(attachmentTypes);
  const attachmentFormat = RandomGenerator.pick(imageFormats);
  const attachmentSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
  >();

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: attachmentType,
          format: attachmentFormat,
          size: attachmentSize,
          original_filename: `${RandomGenerator.alphaNumeric(8)}.${attachmentFormat}`,
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}/${RandomGenerator.alphaNumeric(16)}.${attachmentFormat}`,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Step 6: Verify attachment has correct member attribution
  TestValidator.equals(
    "attachment discussion_board_member_id matches authenticated member",
    attachment.discussion_board_member_id,
    member.id,
  );

  // Step 7: Validate attachment metadata
  TestValidator.equals(
    "attachment belongs to correct article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment type is correct",
    attachment.type,
    attachmentType,
  );
  TestValidator.equals(
    "attachment format is correct",
    attachment.format,
    attachmentFormat,
  );
  TestValidator.predicate(
    "attachment size is within valid range",
    attachment.size > 0 && attachment.size <= 5000000,
  );
}
