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
 * Validate that attachment retrieval rejects mismatched or non-existent
 * combinations of articleId and attachmentId while still allowing valid
 * retrieval.
 *
 * Business context:
 *
 * - Attachments are stored in discussion_board_attachments and belong to exactly
 *   one article via discussion_board_article_id.
 * - The public GET endpoint
 *   /discussionBoard/articles/{articleId}/attachments/{attachmentId} must
 *   enforce that the attachment belongs to the specified article and respect
 *   logical deletion/moderation rules.
 *
 * Scenario steps:
 *
 * 1. Admin user joins and creates a discussionBoard article category.
 * 2. Member user joins and logs in to establish an authenticated member session.
 * 3. Member creates two articles (articleA and articleB) under the created
 *    category.
 * 4. Member creates a single attachment under articleA and records its id.
 * 5. Attempt to fetch the attachment using articleB's id with attachmentA's id and
 *    assert that an error is thrown (not-found style behavior).
 * 6. Attempt to fetch a completely non-existent attachmentId under articleA and
 *    assert that an error is thrown (not-found style behavior).
 * 7. Finally, fetch the attachment using the correct articleA/attachmentA pair and
 *    assert that it succeeds and discussion_board_article_id matches
 *    articleA.id.
 */
export async function test_api_article_single_attachment_retrieval_invalid_article_or_attachment(
  connection: api.IConnection,
) {
  // 1. Admin user joins (registration with automatic authentication)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  // 2. Admin creates an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member user joins and logs in
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(10),
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

  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 4. Member creates two articles: articleA and articleB
  const articleCreateBodyA = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleA: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBodyA },
    );
  typia.assert(articleA);

  const articleCreateBodyB = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const articleB: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBodyB },
    );
  typia.assert(articleB);

  // 5. Member creates one attachment under articleA
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: RandomGenerator.paragraph({ sentences: 1 }),
    content_type: "application/octet-stream",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachmentA: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: articleA.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachmentA);

  TestValidator.equals(
    "attachmentA belongs to articleA",
    attachmentA.discussion_board_article_id,
    articleA.id,
  );

  // 6. Negative case #1: mismatched articleId and attachmentId
  await TestValidator.error(
    "cross-article attachment retrieval should fail",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(connection, {
        articleId: articleB.id,
        attachmentId: attachmentA.id,
      });
    },
  );

  // 7. Negative case #2: non-existent attachment id under valid article
  const nonExistentAttachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-existent attachment retrieval should fail",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(connection, {
        articleId: articleA.id,
        attachmentId: nonExistentAttachmentId,
      });
    },
  );

  // 8. Positive sanity check: correct article/attachment pair succeeds
  const reloadedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: articleA.id,
      attachmentId: attachmentA.id,
    });
  typia.assert(reloadedAttachment);

  TestValidator.equals(
    "reloaded attachment matches created attachment id",
    reloadedAttachment.id,
    attachmentA.id,
  );
  TestValidator.equals(
    "reloaded attachment belongs to articleA",
    reloadedAttachment.discussion_board_article_id,
    articleA.id,
  );
}
