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
 * Validate that an adminUser can update metadata of an attachment created by a
 * memberUser.
 *
 * Business context
 *
 * - MemberUser authors an article and uploads an attachment under that article.
 * - AdminUser later moderates/edits the attachment metadata (file name, content
 *   type, order, status).
 *
 * Steps
 *
 * 1. Create an adminUser (join) and keep its email/password for future login.
 * 2. Create a memberUser (join) and keep its email/password for later reference.
 * 3. Switch to adminUser and create an article category.
 * 4. Switch to memberUser and create an article in that category.
 * 5. Still as memberUser, create an attachment under the article.
 * 6. Switch back to adminUser and update the attachment metadata using the admin
 *    update endpoint.
 * 7. Assert that the response reflects the updated fields while preserving
 *    immutable fields.
 */
export async function test_api_admin_attachment_update_after_member_upload(
  connection: api.IConnection,
) {
  // 1. Register an adminUser via join (also authenticates as adminUser)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a memberUser via join (this updates connection auth to memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch to adminUser again using login so we can create a category as admin
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Create an article category as adminUser
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Switch to memberUser via login so that the article is authored by the member
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://board.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://board.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Create an article under the created category as memberUser
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

  // 7. Create an attachment for the article as memberUser
  const initialOrderInArticle: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const attachmentCreateBody = {
    file_uri: "https://cdn.example.com/files/initial.png" as string &
      tags.Format<"uri">,
    file_name: "initial-name.png",
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: initialOrderInArticle,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const createdAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(createdAttachment);

  // 8. Switch back to adminUser via login to perform the update
  const adminLoginAgainBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAgain: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert(adminLoginAgain);

  // 9. Prepare update payload as adminUser
  const updatedOrderInArticle: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const updateBody = {
    file_name: "updated-name.png",
    content_type: "image/jpeg",
    order_in_article: updatedOrderInArticle,
    status: "hidden",
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.adminUser.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: createdAttachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 10. Assert immutable fields are preserved and mutable fields are updated
  TestValidator.equals(
    "attachment id must be preserved",
    updatedAttachment.id,
    createdAttachment.id,
  );
  TestValidator.equals(
    "parent article id must be preserved",
    updatedAttachment.discussion_board_article_id,
    createdAttachment.discussion_board_article_id,
  );
  TestValidator.equals(
    "file size must be preserved",
    updatedAttachment.file_size,
    createdAttachment.file_size,
  );
  TestValidator.equals(
    "created_at must be preserved",
    updatedAttachment.created_at,
    createdAttachment.created_at,
  );
  TestValidator.equals(
    "deleted_at must be preserved",
    updatedAttachment.deleted_at ?? null,
    createdAttachment.deleted_at ?? null,
  );

  TestValidator.equals(
    "file_name should be updated",
    updatedAttachment.file_name,
    updateBody.file_name,
  );
  TestValidator.equals(
    "content_type should be updated",
    updatedAttachment.content_type,
    updateBody.content_type,
  );
  TestValidator.equals(
    "order_in_article should be updated",
    updatedAttachment.order_in_article,
    updateBody.order_in_article,
  );
  TestValidator.equals(
    "status should be updated",
    updatedAttachment.status,
    updateBody.status,
  );
}
