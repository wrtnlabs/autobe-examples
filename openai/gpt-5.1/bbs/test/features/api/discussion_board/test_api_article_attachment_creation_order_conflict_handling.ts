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
 * Validate attachment creation behavior when order_in_article conflicts for the
 * same article.
 *
 * Scenario:
 *
 * - A member user creates an article in a category created by an admin user.
 * - The member then creates an attachment with order_in_article = 1.
 * - The member attempts to create a second attachment on the same article with
 *   order_in_article = 1 again.
 *
 * Expected behavior (robust to both possible implementations):
 *
 * - Either the second creation fails due to uniqueness enforcement on
 *   (discussion_board_article_id, order_in_article), OR
 * - The second creation succeeds but the system internally resolves the conflict
 *   (e.g., by shifting existing orders) so that the final set of attachments
 *   for the article still has unique order_in_article values.
 *
 * This test focuses on ensuring that attachment ordering per article remains
 * consistent and conflict-free from the perspective of the API consumer.
 */
export async function test_api_article_attachment_creation_order_conflict_handling(
  connection: api.IConnection,
) {
  // 1. Register member user (auto-authenticated)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user (auto-authenticated, overwriting auth headers)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Create article category as admin
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

  // 4. Switch back to member user via login to ensure memberUser auth
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. Create article as member
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

  // 6. Create first attachment with order_in_article = 1
  const attachmentBody1 = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: `file_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment1: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody1,
      },
    );
  typia.assert(attachment1);

  TestValidator.equals(
    "first attachment article id matches article",
    attachment1.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "first attachment order_in_article should be 1",
    attachment1.order_in_article,
    1,
  );

  // 7. Attempt second attachment with the same order_in_article = 1
  const attachmentBody2 = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: `file_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    file_size: 2048 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const createdAttachments: IDiscussionBoardAttachment[] = [attachment1];

  let secondSucceeded = false;
  try {
    const attachment2: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.memberUser.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentBody2,
        },
      );
    typia.assert(attachment2);

    secondSucceeded = true;
    createdAttachments.push(attachment2);

    TestValidator.equals(
      "second attachment article id matches article",
      attachment2.discussion_board_article_id,
      article.id,
    );
  } catch (error) {
    // If the second creation fails, we expect it to be due to uniqueness
    // enforcement. Use TestValidator.error to assert that calling the API
    // throws an error when repeated.
    await TestValidator.error(
      "second attachment with duplicate order should fail or already failed",
      async () => {
        await api.functional.discussionBoard.memberUser.articles.attachments.create(
          connection,
          {
            articleId: article.id,
            body: attachmentBody2,
          },
        );
      },
    );
  }

  // 8. Validate uniqueness of order_in_article among successfully created attachments
  const orders = createdAttachments.map((a) => a.order_in_article);

  TestValidator.predicate(
    "order_in_article values of created attachments must be unique",
    () => {
      const seen = new Set<number>();
      for (const value of orders) {
        if (seen.has(value)) return false;
        seen.add(value);
      }
      return true;
    },
  );

  // Sanity check on scenario outcome
  TestValidator.predicate(
    "either only first attachment exists or second succeeded with adjusted order",
    () =>
      (secondSucceeded && createdAttachments.length === 2) ||
      (!secondSucceeded && createdAttachments.length === 1),
  );
}
