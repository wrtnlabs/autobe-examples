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
 * Validate admin-driven logical deletion of a member-authored article
 * attachment.
 *
 * Business flow:
 *
 * 1. Admin registers and is authenticated (adminUser join).
 * 2. Admin creates an article category.
 * 3. Member registers and is authenticated (memberUser join).
 * 4. Member creates an article in that category.
 * 5. Member uploads two attachments to the article.
 * 6. Admin logs in again (switch actor back to admin).
 * 7. Admin deletes one attachment via admin delete endpoint.
 * 8. Attachments listing for the article no longer includes the deleted
 *    attachment, but still includes the other.
 */
export async function test_api_admin_attachment_delete_success_flow(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member registration & authentication via join
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article under the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. Member uploads two attachments to the article
  const createAttachmentBody = (
    order: number,
  ): IDiscussionBoardAttachment.ICreate => ({
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: RandomGenerator.paragraph({ sentences: 1 }),
    content_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
    ] as const),
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: order as number & tags.Type<"int32">,
    status: "active",
  });

  const attachment1: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: createAttachmentBody(1),
      },
    );
  typia.assert(attachment1);

  const attachment2: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: createAttachmentBody(2),
      },
    );
  typia.assert(attachment2);

  // Sanity check: attachment ids are distinct
  TestValidator.notEquals(
    "attachments created with different ids",
    attachment1.id,
    attachment2.id,
  );

  // 6. Switch back to admin via login to ensure admin authority
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminReAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuthorized);

  // 7. Admin deletes the first attachment
  await api.functional.discussionBoard.adminUser.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment1.id,
    },
  );

  // 8. List attachments for the article and verify visibility
  const listRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortField: undefined,
    sortOrder: undefined,
    fileExtension: undefined,
    contentType: undefined,
  } satisfies IDiscussionBoardAttachment.IRequest;

  const pageResult: IPageIDiscussionBoardAttachment.ISummary =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: listRequestBody,
      },
    );
  typia.assert(pageResult);

  const data = pageResult.data;

  // Pagination metadata should be consistent with data length
  TestValidator.equals(
    "pagination.records equals data length",
    pageResult.pagination.records,
    data.length,
  );

  // Deleted attachment should not be present
  const deletedStillExists = data.some((a) => a.id === attachment1.id);
  TestValidator.predicate(
    "deleted attachment is not returned in attachment listing",
    deletedStillExists === false,
  );

  // Non-deleted attachment should still be present
  const remainingExists = data.some((a) => a.id === attachment2.id);
  TestValidator.predicate(
    "non-deleted attachment remains visible in listing",
    remainingExists === true,
  );
}
