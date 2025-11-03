import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins (registers)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Passw0rd!";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Member creates a discussion board article
  const articleBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({ paragraphs: 2 }),
  };

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 3. Member creates an attachment for the article
  const attachmentBody: IDiscussionBoardAttachment.ICreate = {
    filename: `${RandomGenerator.alphaNumeric(8)}.png`,
    file_type: "image/png",
    file_url: `https://example.com/uploads/${RandomGenerator.alphaNumeric(10)}.png`,
  };

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 4. Member deletes the attachment
  await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete a different member's attachment (expect failure)
  // We register a new member and their article, attachment, then try deleting original attachment with new member
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = "OtherPass123!";
  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: otherMemberEmail,
        password: otherMemberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(otherMember);

  // Other member creates article
  const otherArticleBody: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content_markdown: RandomGenerator.content(),
  };

  const otherArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: otherArticleBody,
      },
    );
  typia.assert(otherArticle);

  // Other member creates attachment
  const otherAttachmentBody: IDiscussionBoardAttachment.ICreate = {
    filename: `${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_type: "image/jpeg",
    file_url: `https://example.com/uploads/${RandomGenerator.alphaNumeric(12)}.jpg`,
  };

  const otherAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: otherArticle.id,
        body: otherAttachmentBody,
      },
    );
  typia.assert(otherAttachment);

  // Switch connection auth to the first member by re-joining the member (simulate re-login)
  // Ensuring authorization enforcement by trying to delete other member's attachment
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ICreate,
  });

  await TestValidator.error(
    "Member cannot delete attachment of another member's article",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
        connection,
        {
          articleId: otherArticle.id,
          attachmentId: otherAttachment.id,
        },
      );
    },
  );
}
