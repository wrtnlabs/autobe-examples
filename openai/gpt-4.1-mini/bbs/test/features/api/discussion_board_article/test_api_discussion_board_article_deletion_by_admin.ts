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

/**
 * Test permanent deletion of a discussion board article by an authenticated
 * admin user.
 *
 * This test performs the following sequence:
 *
 * 1. Register an admin user for authentication.
 * 2. Register a member user for article creation.
 * 3. Login both admin and member to obtain authentication tokens.
 * 4. Login as member and create a new discussion board article with attachments.
 * 5. Switch authentication context to admin.
 * 6. Admin deletes the article by id.
 * 7. Confirm deletion by attempting to delete again (expect error) or validate
 *    absence.
 */
export async function test_api_discussion_board_article_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin-password123";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2. Member joins (registers)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member-password123";
  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ICreate;
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 3. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "http://localhost/",
    referrer: "http://localhost/referrer",
  } satisfies IDiscussionBoardAdmin.ILogin;

  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 4. Member login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    href: "http://localhost/",
    referrer: "http://localhost/referrer",
  } satisfies IDiscussionBoardMember.ILogin;

  await api.functional.auth.member.login(connection, {
    body: memberLoginBody,
  });

  // 5. Member creates a discussion board article
  const attachmentCount = 2;
  const attachments = ArrayUtil.repeat(attachmentCount, () => {
    const filename = RandomGenerator.name(1).replace(/[\\s]/g, "") + ".png";
    return {
      filename: filename,
      file_type: "image/png",
      file_url: `https://cdn.example.com/${filename}`,
    };
  });

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({ paragraphs: 2 }),
    discussion_board_attachments: attachments,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(article);

  // validate attachments count
  TestValidator.equals(
    "article created with correct attachment count",
    article.discussion_board_attachments.length,
    attachmentCount,
  );

  // 6. Switch context: admin login again to ensure auth header is correct
  // (Already done above, but re-login to simulate actor switching)
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // 7. Admin deletes the article
  await api.functional.discussionBoard.admin.discussionBoardArticles.erase(
    connection,
    {
      articleId: article.id,
    },
  );

  // 8. Validate that deletion occurred by trying to delete again and expecting error
  await TestValidator.error(
    "deleting already deleted article should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardArticles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
