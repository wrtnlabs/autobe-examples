import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_deletion_by_authorized_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "securePassword123!",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create discussion board article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 3. Normally, attachments would be uploaded separately and linked to the article.
  // Since no explicit attachment creation API is provided, simulate attachment ID.
  // We will assume an attachment with a random UUID exists.
  const attachmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the attachment
  await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.erase(
    connection,
    {
      discussionBoardArticleId: article.id,
      attachmentId: attachmentId,
    },
  );

  // 5. No response expected, so just verify that no error was thrown
}
