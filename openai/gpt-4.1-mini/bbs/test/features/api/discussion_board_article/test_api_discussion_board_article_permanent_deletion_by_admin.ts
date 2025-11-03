import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Member creates an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    discussion_board_attachments: [
      {
        filename: "image1.png",
        file_type: "image/png",
        file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(12)}.png`,
      },
      {
        filename: "doc1.pdf",
        file_type: "application/pdf",
        file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(12)}.pdf`,
      },
    ],
  } satisfies IDiscussionBoardArticle.ICreate;
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(createdArticle);

  // 4. Admin deletes the article
  await api.functional.discussionBoard.admin.discussionBoardArticles.erase(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
}
