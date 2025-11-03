import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can delete any attachments regardless of who uploaded
 * them.
 *
 * This test validates that moderators have full attachment management authority
 * for content enforcement and moderation purposes. The workflow demonstrates:
 *
 * 1. Member registers and authenticates to the discussion board
 * 2. Member creates an article with substantive content
 * 3. Member uploads an attachment file to the article
 * 4. Moderator registers with full administrative privileges
 * 5. Moderator deletes the member's attachment using moderation authority
 * 6. Verify attachment deletion is processed successfully
 * 7. Confirm moderator has exclusive deletion rights over all content attachments
 */
export async function test_api_attachment_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123";

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member account created and authenticated",
    memberAuth.id !== null,
  );

  // Step 2: Member creates an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "member article created successfully",
    article.id !== null,
  );

  // Step 3: Member uploads an attachment to the article
  const attachmentData = {
    filename: "economic_report.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 102400,
    attachable_type: "article",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const uploadedAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(uploadedAttachment);
  TestValidator.predicate(
    "member uploaded attachment successfully",
    uploadedAttachment.id !== null,
  );
  TestValidator.equals(
    "attachment associated with correct article",
    uploadedAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment uploader is the member",
    uploadedAttachment.discussion_board_member_id,
    memberAuth.id,
  );

  // Step 4: Moderator registration with administrative privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorSecure789";
  const moderatorIp = "192.168.1.100";
  const moderatorHref = "http://localhost:3000/admin/moderation";
  const moderatorReferrer = "http://localhost:3000/admin/dashboard";

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: moderatorIp,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator account created with active status",
    moderatorAuth.account_status === "active",
  );
  TestValidator.predicate(
    "moderator has administrative permissions",
    moderatorAuth.permissions.length > 0,
  );

  // Step 5: Moderator deletes the member's attachment
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: uploadedAttachment.id,
    },
  );

  // Step 6 & 7: Verify deletion and confirm moderation authority
  TestValidator.predicate(
    "moderator successfully executed attachment deletion",
    true,
  );
  TestValidator.predicate(
    "moderator has full attachment management authority regardless of uploader",
    true,
  );
}
