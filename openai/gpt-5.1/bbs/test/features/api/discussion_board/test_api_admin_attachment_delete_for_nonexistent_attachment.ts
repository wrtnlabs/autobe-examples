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
 * Verify admin deletion of a non-existent attachment under a valid article.
 *
 * Business goal
 *
 * - Ensure that the admin-only erase endpoint for article attachments does not
 *   succeed when the targeted attachment does not exist for the given article,
 *   and that such a failed attempt does not affect existing attachments.
 *
 * High-level flow
 *
 * 1. Create an admin user by calling auth.adminUser.join (admin is now
 *    authenticated in the shared connection).
 * 2. As admin, create an article category via
 *    discussionBoard.adminUser.articleCategories.create.
 * 3. Create a member user by calling auth.memberUser.join (connection now
 *    authenticated as member).
 * 4. As member, create an article in that category via
 *    discussionBoard.memberUser.articles.create.
 * 5. Optionally create a single real attachment for that article via
 *    discussionBoard.memberUser.articles.attachments.create so that there is at
 *    least one legitimate attachment in the system.
 * 6. Switch authentication back to admin using auth.adminUser.login.
 * 7. Generate a random UUID for attachmentId that is guaranteed to be different
 *    from the real attachment id.
 * 8. Invoke discussionBoard.adminUser.articles.attachments.erase with the valid
 *    articleId and the non-existent attachmentId, and assert that this call
 *    fails using TestValidator.error (without checking HTTP status codes
 *    explicitly).
 * 9. Finally, call discussionBoard.articles.attachments.index for the article to
 *    verify that the existing legitimate attachment count remains unchanged.
 */
export async function test_api_admin_attachment_delete_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to get an authenticated admin session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
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

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 2. Create an article category as admin
  const categoryBody = {
    code: `CODE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 3. Member registration (join) to get an authenticated member session
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword123!",
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

  const memberEmail = memberAuthorized.email;
  const memberPassword = memberJoinBody.password;

  // 4. As member, create an article in the created category
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

  // 5. Create one valid attachment for that article as member
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(12),
    file_name: "sample-document.pdf",
    content_type: "application/pdf",
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const realAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(realAttachment);

  // 5.a Verify via index that the article has exactly one attachment
  const initialIndex =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 0,
          limit: 10,
          sortField: undefined,
          sortOrder: undefined,
          fileExtension: undefined,
          contentType: undefined,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(initialIndex);
  TestValidator.equals(
    "initial attachments count should be 1",
    initialIndex.pagination.records,
    1,
  );

  // 6. Switch authentication back to admin using login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. Generate a random UUID that does not match the real attachment id
  const nonExistentAttachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Make sure (best-effort) it's different from the real attachment id
  const effectiveNonExistentAttachmentId =
    nonExistentAttachmentId === realAttachment.id
      ? typia.random<string & tags.Format<"uuid">>()
      : nonExistentAttachmentId;

  // 8. Attempt to delete the non-existent attachment as admin and assert error
  await TestValidator.error(
    "deleting non-existent attachment as admin should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: effectiveNonExistentAttachmentId,
        },
      );
    },
  );

  // 9. Re-list attachments for the article to confirm no change
  const finalIndex =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 0,
          limit: 10,
          sortField: undefined,
          sortOrder: undefined,
          fileExtension: undefined,
          contentType: undefined,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(finalIndex);

  TestValidator.equals(
    "final attachments count should remain 1",
    finalIndex.pagination.records,
    1,
  );

  if (finalIndex.data.length > 0) {
    TestValidator.equals(
      "remaining attachment id should match original attachment",
      finalIndex.data[0].id,
      realAttachment.id,
    );
  }
}
