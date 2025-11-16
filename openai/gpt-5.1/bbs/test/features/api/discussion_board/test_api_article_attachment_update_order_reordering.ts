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
 * Validate updating an attachment's order within an article.
 *
 * Business workflow:
 *
 * 1. Admin joins and creates an article category.
 * 2. Member joins.
 * 3. Member creates an article in that category.
 * 4. Member creates two attachments (A: order 1, B: order 2) for the article.
 * 5. Member updates attachment B setting order_in_article to 1 using PUT.
 * 6. Test checks that the update succeeds and that the updated attachment still
 *    belongs to the same article and has the new order value.
 */
export async function test_api_article_attachment_update_order_reordering(
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
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
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
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
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
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. Member creates two attachments A (order 1) and B (order 2)
  const baseUri = "https://cdn.example.com/files";

  const attachmentABody = {
    file_uri: `${baseUri}/${RandomGenerator.alphaNumeric(16)}.pdf`,
    file_name: "attachment-a.pdf",
    content_type: "application/pdf",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentA: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentABody,
      },
    );
  typia.assert(attachmentA);

  const attachmentBBody = {
    file_uri: `${baseUri}/${RandomGenerator.alphaNumeric(16)}.pdf`,
    file_name: "attachment-b.pdf",
    content_type: "application/pdf",
    file_size: 2048 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 2 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentB: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBBody,
      },
    );
  typia.assert(attachmentB);

  TestValidator.equals(
    "initial attachment A order is 1",
    attachmentA.order_in_article,
    1 as number,
  );
  TestValidator.equals(
    "initial attachment B order is 2",
    attachmentB.order_in_article,
    2 as number,
  );

  // 6. Update attachment B to conflict order (1)
  const updateBody = {
    order_in_article: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedB: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachmentB.id,
        body: updateBody,
      },
    );
  typia.assert(updatedB);

  // Validate updated attachment still belongs to same article and has new order
  TestValidator.equals(
    "updated attachment B belongs to same article",
    updatedB.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "updated attachment B has new order 1",
    updatedB.order_in_article,
    1 as number,
  );
}
