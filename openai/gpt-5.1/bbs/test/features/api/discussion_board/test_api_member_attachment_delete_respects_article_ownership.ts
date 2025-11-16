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
 * Validate that memberUser attachment deletion respects article ownership.
 *
 * Business goal:
 *
 * - Ensure only the owning member user of an article (or a properly authenticated
 *   role) can delete its attachments through the memberUser attachment erase
 *   endpoint.
 *
 * High-level flow:
 *
 * 1. Create two member users: ownerMember and otherMember via
 *    /auth/memberUser/join.
 * 2. Create an adminUser via /auth/adminUser/join for category management.
 * 3. As adminUser, create an article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch to ownerMember and create an article under that category via
 *    /discussionBoard/memberUser/articles.
 * 5. As ownerMember, create an attachment under the article via
 *    /discussionBoard/memberUser/articles/{articleId}/attachments.
 * 6. Switch to otherMember and attempt to delete the attachment via the memberUser
 *    erase endpoint, expecting an authorization/permission error.
 * 7. Switch back to ownerMember and successfully delete the same attachment.
 * 8. Since no attachment "list" API exists, we treat successful owner delete after
 *    failed other delete as proof of ownership-based enforcement.
 */
export async function test_api_member_attachment_delete_respects_article_ownership(
  connection: api.IConnection,
) {
  // 1. Register owner member user
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerPassword: string = RandomGenerator.alphaNumeric(12);

  const ownerJoinBody = {
    email: ownerEmail,
    password: ownerPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.example.com/join/owner",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const ownerAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuthorized);

  // 2. Register other member user
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherPassword: string = RandomGenerator.alphaNumeric(12);

  const otherJoinBody = {
    email: otherEmail,
    password: otherPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://frontend.example.com/join/other",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const otherAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: otherJoinBody,
    });
  typia.assert(otherAuthorized);

  // 3. Register admin user for category creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create an article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Login as ownerMember to create article
  const ownerLoginBody = {
    email: ownerEmail,
    password: ownerPassword,
    ip: null,
    href: "https://frontend.example.com/login/owner",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const ownerLoginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: ownerLoginBody,
    });
  typia.assert(ownerLoginResult);

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

  // 6. As ownerMember, create an attachment for the article
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `${RandomGenerator.name(1)}.txt`,
    content_type: "text/plain",
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 7. Switch to otherMember and attempt to delete the attachment (expect error).
  const otherLoginBody = {
    email: otherEmail,
    password: otherPassword,
    ip: null,
    href: "https://frontend.example.com/login/other",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const otherLoginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: otherLoginBody,
    });
  typia.assert(otherLoginResult);

  await TestValidator.error(
    "other member cannot delete another member's article attachment",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 8. Switch back to ownerMember and delete the attachment successfully.
  const ownerReloginBody = {
    email: ownerEmail,
    password: ownerPassword,
    ip: null,
    href: "https://frontend.example.com/login/owner",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const ownerReloginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: ownerReloginBody,
    });
  typia.assert(ownerReloginResult);

  await api.functional.discussionBoard.memberUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // Logical post-conditions: if we reached here, authorization rules behaved as expected.
  TestValidator.predicate(
    "owner member successfully deletes their own attachment after other member is denied",
    true,
  );
}
