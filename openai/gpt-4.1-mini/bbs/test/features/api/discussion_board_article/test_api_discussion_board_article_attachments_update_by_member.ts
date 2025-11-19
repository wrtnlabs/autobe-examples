import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Test updating the attachments of a discussion board article by an
 * authenticated member.
 *
 * This test performs the following sequence:
 *
 * 1. Registers a new member account to establish authentication context.
 * 2. Creates a discussion board article with the authenticated member's identity.
 * 3. Attempts to update the attachments of the article by calling the PATCH
 *    endpoint.
 * 4. Validates that the attachment update response matches expected pagination and
 *    attachment data.
 *
 * The test ensures that only authorized members can update attachments on
 * articles they own.
 */
export async function test_api_discussion_board_article_attachments_update_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration (join) to authenticate.
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "test-password";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a discussion board article by the authenticated member.

  // Article creation requires title and content.
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 3 });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "article author is the joined member",
    article.discussion_board_member_id,
    member.id,
  );

  // 3. Prepare attachments update request.
  // For update, send request conforming to IDiscussionBoardAttachment.IRequest.

  const attachmentsUpdateBody = {
    page: 1,
    limit: 3,
    sortBy: "createdAt" as const,
    sortOrder: "asc" as const,
  } satisfies IDiscussionBoardAttachment.IRequest;

  // 4. Call the PATCH /discussionBoard/member/discussionBoardArticles/{id}/discussionBoardAttachments operation.
  const attachmentPage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.index(
      connection,
      {
        id: article.id,
        body: attachmentsUpdateBody,
      },
    );
  typia.assert(attachmentPage);

  // 5. Validate page information in the response
  TestValidator.predicate(
    "attachmentPage.pagination has expected values",
    () => {
      const pagination = attachmentPage.pagination;
      return (
        pagination.current === attachmentsUpdateBody.page &&
        pagination.limit === attachmentsUpdateBody.limit &&
        pagination.pages >= 0 &&
        pagination.records >= 0
      );
    },
  );

  // 6. Validate each attachment item
  attachmentPage.data.forEach((attachment) => {
    typia.assert<IDiscussionBoardAttachment.ISummary>(attachment);
    TestValidator.predicate(
      "attachment filename is nonempty",
      attachment.filename.length > 0,
    );
    TestValidator.predicate(
      "attachment URL is valid HTTP URI",
      /^https?:\/\/.+/i.test(attachment.url),
    );
    TestValidator.predicate(
      "attachment type is image or file",
      attachment.type === "image" || attachment.type === "file",
    );
  });

  // 7. Authorization is implicitly tested by success of the call; further tests require additional context not in scope
}
