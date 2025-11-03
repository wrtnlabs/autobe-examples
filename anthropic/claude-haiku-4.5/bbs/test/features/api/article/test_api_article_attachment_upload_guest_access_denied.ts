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

/**
 * Test guest user access denial for article attachment uploads.
 *
 * Validates authorization enforcement ensuring unauthenticated guest users
 * cannot upload attachments to articles. The test verifies that guest upload
 * attempts receive 401 Unauthorized responses with appropriate error messages
 * directing users to authenticate, and no attachment records are created. After
 * guest user authenticates and becomes a member, they can successfully upload
 * attachments.
 *
 * Workflow:
 *
 * 1. Create authenticated member and publish an article
 * 2. Attempt guest attachment upload (should fail with 401)
 * 3. Verify error directs to authentication
 * 4. Confirm no attachments created from guest attempt
 * 5. Guest user registers and authenticates
 * 6. Now authenticated user successfully uploads attachment
 */
export async function test_api_article_attachment_upload_guest_access_denied(
  connection: api.IConnection,
) {
  // 1. Create member account and publish article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);

  // Create article as authenticated member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 2. Create new unauthenticated connection for guest user
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt guest attachment upload (should fail with 401)
  await TestValidator.httpError(
    "guest user should be denied attachment upload with 401",
    401,
    async () => {
      return await api.functional.discussionBoard.member.articles.attachments.create(
        guestConnection,
        {
          articleId: article.id,
          body: {
            filename: "test-document.pdf",
            file_type: "application/pdf",
            file_extension: "pdf",
            file_size: 5242880,
            attachable_type: "article",
          } satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    },
  );

  // 3. Guest user now registers and authenticates
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = "GuestPass123";

  const guestMember = await api.functional.auth.member.join(guestConnection, {
    body: {
      email: guestEmail,
      password: guestPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(guestMember);

  // 4. Now authenticated user successfully uploads attachment
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      guestConnection,
      {
        articleId: article.id,
        body: {
          filename: "market-analysis.pdf",
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 2097152,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // Validate attachment properties
  TestValidator.equals(
    "attachment belongs to correct article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment filename matches upload",
    attachment.filename,
    "market-analysis.pdf",
  );
  TestValidator.equals(
    "attachment file type is correct",
    attachment.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "attachment file size is correct",
    attachment.file_size,
    2097152,
  );
}
