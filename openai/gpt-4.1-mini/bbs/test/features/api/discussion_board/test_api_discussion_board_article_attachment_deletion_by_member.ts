import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "validPassword1234";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Member creates a new article
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleMarkdown = RandomGenerator.content({ paragraphs: 2 });
  const articleCreateBody = {
    title: articleTitle,
    content_markdown: articleMarkdown,
    discussion_board_attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Add multiple attachments to the article
  const attachmentCreateBodies = ArrayUtil.repeat(2, () => {
    return {
      filename: `${RandomGenerator.name(1)}.png`,
      file_type: "image/png",
      file_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.png`,
    } satisfies IDiscussionBoardAttachment.ICreate;
  });

  const attachments: IDiscussionBoardAttachment[] = [];
  for (const attachmentCreateBody of attachmentCreateBodies) {
    const attachment =
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentCreateBody,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }

  TestValidator.equals("attachments added count", attachments.length, 2);

  // 4. Delete one attachment successfully
  const toDeleteAttachment = attachments[0];
  await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: toDeleteAttachment.id,
    },
  );

  // 5. Try to delete same attachment again should cause error
  await TestValidator.error(
    "deleting already deleted attachment fails",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: toDeleteAttachment.id,
        },
      );
    },
  );

  // 6. Register a second member who should have no permission to delete other member's attachments
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = "somePassword5678";
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        password: otherMemberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // 7. Use a new unauthenticated connection for unauthorized deletion attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 8. Attempt deletion by other member - must fail
  await TestValidator.error(
    "unauthorized member cannot delete another member's attachment",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
        unauthConn,
        {
          articleId: article.id,
          attachmentId: attachments[1].id,
        },
      );
    },
  );
}
