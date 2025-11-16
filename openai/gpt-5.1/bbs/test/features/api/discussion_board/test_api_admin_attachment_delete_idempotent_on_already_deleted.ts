import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Validate admin attachment deletion idempotency.
 *
 * This test verifies that when an admin deletes an attachment under a
 * discussion-board article, repeating the DELETE against the same
 * article/attachment pair does not resurrect the attachment and behaves in a
 * stable, well-defined manner.
 *
 * Business flow:
 *
 * 1. Register an adminUser and obtain its token.
 * 2. As the adminUser, create an article category for the discussion board.
 * 3. Register a memberUser and authenticate that actor.
 * 4. As the memberUser, create an article in the created category.
 * 5. As the memberUser, create a single attachment for that article.
 * 6. Switch back to the adminUser actor.
 * 7. Perform the first DELETE on the attachment as adminUser; it should logically
 *    delete the attachment.
 * 8. List the article's attachments and confirm the deleted attachment is not
 *    present.
 * 9. Perform the second DELETE on the same attachment as adminUser; either
 *    idempotent success (no error) or a domain error is acceptable, but it must
 *    not recreate the attachment.
 * 10. List the article's attachments again and confirm that the attachment is still
 *     absent.
 */
export async function test_api_admin_attachment_delete_idempotent_on_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (admin join) and get tokens.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. As adminUser, create an article category.
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Register a memberUser and authenticate.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberEmail = memberAuthorized.email;
  const memberPassword = memberJoinBody.password;

  // 4. As memberUser, create an article.
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. As memberUser, create an attachment for the article.
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(12),
    file_name: RandomGenerator.paragraph({ sentences: 1 }),
    content_type: "application/pdf",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  const attachmentId = attachment.id;

  // Optional sanity: list attachments before delete and ensure it contains the attachment.
  const beforeDeletePage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(beforeDeletePage);

  const beforeIds = beforeDeletePage.data.map((a) => a.id);
  TestValidator.predicate(
    "attachment should be present before delete",
    beforeIds.includes(attachmentId),
  );

  // 6. Ensure we are in adminUser context again (explicit login for clarity).
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 7. First DELETE as adminUser.
  await api.functional.discussionBoard.adminUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId,
    },
  );

  // 8. List attachments after first DELETE and confirm absence.
  const afterFirstDeletePage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(afterFirstDeletePage);

  const afterFirstIds = afterFirstDeletePage.data.map((a) => a.id);
  TestValidator.predicate(
    "attachment should be absent after first delete",
    afterFirstIds.includes(attachmentId) === false,
  );

  // 9. Second DELETE on same attachment as adminUser.
  // Either success (no error) or a domain error (e.g., not found) is acceptable.
  try {
    await api.functional.discussionBoard.adminUser.articles.attachments.erase(
      connection,
      {
        articleId: article.id,
        attachmentId,
      },
    );
  } catch {
    // Treat error as acceptable behavior for already-deleted attachment.
  }

  // 10. List attachments again after second DELETE and confirm the attachment is still absent.
  const afterSecondDeletePage: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {},
      },
    );
  typia.assert(afterSecondDeletePage);

  const afterSecondIds = afterSecondDeletePage.data.map((a) => a.id);
  TestValidator.predicate(
    "attachment should remain absent after second delete",
    afterSecondIds.includes(attachmentId) === false,
  );
}
