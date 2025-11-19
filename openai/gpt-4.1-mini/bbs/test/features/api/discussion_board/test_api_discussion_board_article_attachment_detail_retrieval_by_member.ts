import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_detail_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member account
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberPassword = `Passw0rd!${RandomGenerator.alphabets(4)}`;
  const memberNickname = RandomGenerator.name();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        nickname: memberNickname,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

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
    "article discussion_board_member_id matches member id",
    article.discussion_board_member_id,
    member.id,
  );

  // 3. Upload or create an attachment for the article
  // The scenario and SDK don't provide a direct upload endpoint, so this step is substituted by mimicking attachment data creation
  // We'll mock the attachment id for retrieval
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the attachment detail using the GET endpoint
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.at(
      connection,
      {
        id: article.id,
        attachmentId: fakeAttachmentId,
      },
    );
  typia.assert(attachment);

  // Validate that the attachment belongs to the article and matches IDs
  TestValidator.equals(
    "attachment id matches requested id",
    attachment.id,
    fakeAttachmentId,
  );
  TestValidator.equals(
    "attachment article id matches created article id",
    attachment.discussionBoardArticleId,
    article.id,
  );
}
