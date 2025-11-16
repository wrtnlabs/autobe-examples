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
 * Verify that logically deleted discussion board article attachments are no
 * longer retrievable by the public single-attachment endpoint, while other
 * active attachments under the same article remain accessible.
 *
 * Scenario:
 *
 * 1. Admin joins and creates an article category.
 * 2. Member joins and creates an article in that category.
 * 3. Member creates two attachments for the article.
 * 4. Member logically deletes one attachment via DELETE endpoint.
 * 5. Public GET for the deleted attachment should fail with an error (not-found
 *    style), i.e. the attachment is no longer visible.
 * 6. Public GET for the non-deleted attachment should still succeed and return
 *    correct metadata.
 */
export async function test_api_article_single_attachment_retrieval_deleted_or_hidden_attachment(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article in that category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. Member creates two attachments for the article
  const activeAttachmentBody = {
    file_uri: "https://cdn.example.com/files/active-file.bin",
    file_name: "active-file.bin",
    content_type: "application/octet-stream",
    file_size: 1024,
    order_in_article: 1,
    status: "ACTIVE",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const deletedAttachmentBody = {
    file_uri: "https://cdn.example.com/files/deleted-file.bin",
    file_name: "deleted-file.bin",
    content_type: "application/octet-stream",
    file_size: 2048,
    order_in_article: 2,
    status: "ACTIVE",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const activeAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: activeAttachmentBody,
      },
    );
  typia.assert(activeAttachment);

  const deletedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: deletedAttachmentBody,
      },
    );
  typia.assert(deletedAttachment);

  // 6. Member logically deletes one attachment via DELETE endpoint
  await api.functional.discussionBoard.memberUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: deletedAttachment.id,
    },
  );

  // 7. Public GET for the deleted attachment should fail
  await TestValidator.error(
    "deleted attachment should not be retrievable via public GET",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(connection, {
        articleId: article.id,
        attachmentId: deletedAttachment.id,
      });
    },
  );

  // 8. Public GET for the active attachment should still succeed
  const reloadedActive: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: activeAttachment.id,
    });
  typia.assert(reloadedActive);

  TestValidator.equals(
    "active attachment id remains accessible",
    reloadedActive.id,
    activeAttachment.id,
  );
  TestValidator.equals(
    "active attachment belongs to same article",
    reloadedActive.discussion_board_article_id,
    article.id,
  );
}
