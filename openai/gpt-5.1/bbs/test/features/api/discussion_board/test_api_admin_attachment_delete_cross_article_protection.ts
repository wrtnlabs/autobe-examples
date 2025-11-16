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
 * Verify that admin delete for article attachments is scoped to the correct
 * parent article and does not allow cross-article deletion.
 *
 * Business goal
 *
 * - Ensure that DELETE
 *   /discussionBoard/adminUser/articles/{articleId}/attachments/{attachmentId}
 *   only deletes an attachment when the attachment actually belongs to the
 *   articleId.
 * - When the attachment belongs to a different article, the operation must fail
 *   and must not remove the attachment from its real parent.
 *
 * Scenario
 *
 * 1. Register an adminUser (admin join), which also authenticates the connection
 *    as adminUser.
 * 2. With the admin session, create a single article category.
 * 3. Register a memberUser (member join) so that we can create articles and
 *    attachments.
 * 4. Under the member session, create two articles (articleA, articleB) that both
 *    reference the same category.
 * 5. Under the member session, create one attachment under articleA.
 * 6. Using the public attachment listing endpoint PATCH
 *    /discussionBoard/articles/{articleId}/attachments, list attachments for
 *    articleA to confirm that exactly one attachment exists and capture its
 *    id.
 * 7. Switch the session back to adminUser using admin login.
 * 8. Attempt to delete the attachment using articleB's id in the URL path but
 *    passing the attachmentId of the attachment that belongs to articleA.
 *
 *    - Expect this operation to fail and throw an error (not-found style or
 *         equivalent).
 * 9. After the failed delete attempt, verify that:
 *
 *    - ArticleA still has the same attachment when listing via the attachments index
 *         API.
 *    - ArticleB still has no attachments.
 */
export async function test_api_admin_attachment_delete_cross_article_protection(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain an adminUser context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://example.com/admin/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Create a reusable article category as admin.
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member registration (join) to obtain a memberUser context.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://example.com/member/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberEmail: string & tags.Format<"email"> = memberAuthorized.email;
  const memberPassword: string = memberJoinBody.password;

  // 4. Under member session, create two articles (articleA and articleB) in the same category.
  const articleABody = {
    title: `Article A - ${RandomGenerator.paragraph({ sentences: 1 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleABody,
      },
    );
  typia.assert(articleA);

  const articleBBody = {
    title: `Article B - ${RandomGenerator.paragraph({ sentences: 1 })}`,
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBBody,
      },
    );
  typia.assert(articleB);

  // 5. Create one attachment under articleA as the member user.
  const attachmentCreateBody = {
    file_uri: "https://cdn.example.com/files/attachment-a1.bin" as string &
      tags.Format<"uri">,
    file_name: "attachment-a1.bin",
    content_type: "application/octet-stream",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentA1: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: articleA.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachmentA1);

  // 6. List attachments for articleA and verify exactly one attachment exists.
  const listARequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortField: undefined,
    sortOrder: undefined,
    fileExtension: undefined,
    contentType: undefined,
  } satisfies IDiscussionBoardAttachment.IRequest;

  const pageA: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: articleA.id,
        body: listARequestBody,
      },
    );
  typia.assert(pageA);

  TestValidator.equals(
    "articleA should have exactly one attachment before cross-article delete attempt",
    pageA.pagination.records,
    1,
  );
  TestValidator.equals(
    "articleA attachments page data length should be 1",
    pageA.data.length,
    1,
  );

  const listedAttachmentA1: IDiscussionBoardAttachment.ISummary = pageA.data[0];
  const attachmentIdOfArticleA = listedAttachmentA1.id;

  // For clarity, also verify that articleB currently has no attachments.
  const listBRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortField: undefined,
    sortOrder: undefined,
    fileExtension: undefined,
    contentType: undefined,
  } satisfies IDiscussionBoardAttachment.IRequest;

  const pageBBefore: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: articleB.id,
        body: listBRequestBody,
      },
    );
  typia.assert(pageBBefore);

  TestValidator.equals(
    "articleB should have zero attachments before cross-article delete attempt",
    pageBBefore.pagination.records,
    0,
  );

  // 7. Switch back to adminUser using login to ensure we are in admin context.
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 8. Cross-article delete attempt: use articleB.id with attachmentId that belongs to articleA.
  await TestValidator.error(
    "cross-article delete with mismatched articleId must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.erase(
        connection,
        {
          articleId: articleB.id,
          attachmentId: attachmentIdOfArticleA,
        },
      );
    },
  );

  // 9. After failed delete, verify articleA still has the attachment and articleB has none.
  const pageAAfter: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: articleA.id,
        body: listARequestBody,
      },
    );
  typia.assert(pageAAfter);

  TestValidator.equals(
    "articleA should still have exactly one attachment after failed cross-article delete",
    pageAAfter.pagination.records,
    1,
  );
  TestValidator.equals(
    "articleA attachments data length should still be 1",
    pageAAfter.data.length,
    1,
  );

  const remainingAttachmentA: IDiscussionBoardAttachment.ISummary =
    pageAAfter.data[0];
  TestValidator.equals(
    "remaining attachment id under articleA should match original attachment id",
    remainingAttachmentA.id,
    attachmentIdOfArticleA,
  );

  const pageBAfter: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: articleB.id,
        body: listBRequestBody,
      },
    );
  typia.assert(pageBAfter);

  TestValidator.equals(
    "articleB should still have zero attachments after failed cross-article delete",
    pageBAfter.pagination.records,
    0,
  );
}
