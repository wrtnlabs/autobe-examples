import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "A1b2C3d4!";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.local/console",
      referrer: "https://test.local",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Member joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "M3mberP@ss!";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Member logs in
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://test.local/forum",
      referrer: "https://test.local/home",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // 5. Member creates article with minimal content
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }) || "Discussion Title",
    content_markdown:
      RandomGenerator.content({ paragraphs: 2 }) || "Some content",
    discussion_board_attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  TestValidator.predicate(
    "article has no attachments initially",
    article.discussion_board_attachments.length === 0,
  );

  // 6. Member adds multiple attachments to the article
  const attachmentsData: IDiscussionBoardAttachment.ICreate[] =
    ArrayUtil.repeat(3, () => ({
      filename: `${RandomGenerator.alphaNumeric(5)}.png`,
      file_type: "image/png",
      file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(10)}.png`,
    }));

  const attachments: IDiscussionBoardAttachment[] = [];

  for (const attachmentData of attachmentsData) {
    const attachment =
      await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentData,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }

  TestValidator.equals(
    "all attachments created",
    attachments.length,
    attachmentsData.length,
  );

  // 7. Admin deletes the second attachment
  const attachmentToDelete = attachments[1];

  await api.functional.discussionBoard.admin.discussionBoardArticles.discussionBoardAttachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachmentToDelete.id,
    },
  );

  // 8. Validate deletion by attempting to delete again - should error
  await TestValidator.error(
    "deleting already deleted attachment should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardArticles.discussionBoardAttachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachmentToDelete.id,
        },
      );
    },
  );

  // 9. Validate deleted attachment is logically removed from memory
  TestValidator.predicate(
    "deleted attachment id is not in original attachments list",
    !attachments.some((a) => a.id === attachmentToDelete.id),
  );
}
