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

/**
 * Ensure adminUser attachment update enforces article-attachment consistency.
 *
 * Business flow:
 *
 * 1. Create an adminUser and memberUser and establish authentication contexts.
 * 2. As adminUser, create an article category.
 * 3. As memberUser, create two articles (A and B) under that category.
 * 4. As memberUser, create an attachment under article A.
 * 5. Switch back to adminUser and attempt to update the attachment while using
 *    article B's id in the path; expect an error.
 * 6. Then update the same attachment under its real owning article A; expect
 *    success and verify the returned attachment.
 */
export async function test_api_admin_attachment_update_prohibits_cross_article_mislink(
  connection: api.IConnection,
) {
  // 1. Join adminUser (also logs in as that admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Join memberUser (also logs in as that member)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to adminUser explicitly (exercise login path)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. Create an article category as adminUser
  const categoryBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 5. Switch to memberUser for article and attachment creation
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 6. Create two articles (A and B) under the same category as memberUser
  const articleABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
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
    title: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 7. Create an attachment under article A as memberUser
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(12),
    file_name: "attachment-A1.txt",
    content_type: "text/plain",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
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

  // Snapshot some original fields for later comparison
  const originalFileName = attachmentA1.file_name;
  const originalContentType = attachmentA1.content_type;
  const originalOrder = attachmentA1.order_in_article;
  const originalStatus = attachmentA1.status;

  // 8. Switch back to adminUser for privileged update attempts
  const adminRelogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 9. Attempt cross-article update: use articleB.id with attachment from articleA
  const crossUpdateBody = {
    file_name: originalFileName + "-cross",
    content_type: originalContentType,
    order_in_article: (originalOrder + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    status: originalStatus,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  await TestValidator.error(
    "cross-article admin update must fail when articleId does not own attachment",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.update(
        connection,
        {
          articleId: articleB.id,
          attachmentId: attachmentA1.id,
          body: crossUpdateBody,
        },
      );
    },
  );

  // 10. Perform a valid update for the same attachment under its correct article A
  const validFileName = `${originalFileName}-valid`;
  const validContentType = originalContentType;
  const validOrder = (originalOrder + 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const validStatus = "hidden";

  const validUpdateBody = {
    file_name: validFileName,
    content_type: validContentType,
    order_in_article: validOrder,
    status: validStatus,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.adminUser.articles.attachments.update(
      connection,
      {
        articleId: articleA.id,
        attachmentId: attachmentA1.id,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 11. Verify that the successful update actually changed the attachment
  TestValidator.equals(
    "updated attachment should keep the same id",
    updatedAttachment.id,
    attachmentA1.id,
  );
  TestValidator.equals(
    "updated attachment should remain bound to article A",
    updatedAttachment.discussion_board_article_id,
    articleA.id,
  );
  TestValidator.equals(
    "file_name should be updated only in the valid update scenario",
    updatedAttachment.file_name,
    validFileName,
  );
  TestValidator.equals(
    "content_type should reflect the last valid update value",
    updatedAttachment.content_type,
    validContentType,
  );
  TestValidator.equals(
    "order_in_article should reflect the new order from valid update",
    updatedAttachment.order_in_article,
    validOrder,
  );
  TestValidator.equals(
    "status should be updated to hidden by the valid update",
    updatedAttachment.status,
    validStatus,
  );
}
