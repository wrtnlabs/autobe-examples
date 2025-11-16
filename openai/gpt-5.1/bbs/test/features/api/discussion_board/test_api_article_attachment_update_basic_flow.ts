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
 * Verify that a member user can update mutable metadata of an attachment on
 * their own article.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and get an authenticated member session.
 * 2. Register an admin user (join) and get an authenticated admin session.
 * 3. As the admin, create an article category.
 * 4. As the member user, create an article in that category.
 * 5. As the member, create an attachment for the article with initial metadata.
 * 6. As the same member, update the attachment via PUT
 *    /discussionBoard/memberUser/articles/{articleId}/attachments/{attachmentId}
 *    using IDiscussionBoardAttachment.IUpdate to change file_name and
 *    order_in_article.
 * 7. Validate that:
 *
 *    - Id stays the same.
 *    - Discussion_board_article_id still points to the original article.id.
 *    - File_name and order_in_article are updated to new values.
 *    - File_uri, file_size, content_type, status are preserved.
 *    - Updated_at is changed (and is later than or different from original
 *         updated_at).
 *    - Deleted_at remains null/undefined.
 */
export async function test_api_article_attachment_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register member user (join) -> auto-sets Authorization header for memberUser
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/join",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Keep member email/password for later login (actor switching)
  const memberEmail: string & tags.Format<"email"> = memberJoinBody.email;
  const memberPassword: string = memberJoinBody.password;

  // 2. Register admin user (join) -> becomes current actor (adminUser)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(1),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.2",
    href: "https://frontend.local/admin/join",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Create article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 4. Switch back to member user via login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.3",
    href: "https://frontend.local/login",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorized2: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorized2);

  // 5. Create article in the created category as member
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

  // 6. Create an attachment for the article as member
  const attachmentCreateBody = {
    file_uri: "https://cdn.local/files/" + RandomGenerator.alphaNumeric(12),
    file_name: "initial_file_name.txt",
    content_type: "text/plain",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const originalAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(originalAttachment);

  // 7. Prepare update payload modifying file_name and order_in_article
  const updatedFileName = "updated_file_name.txt";
  const updatedOrder: number & tags.Type<"int32"> & tags.Minimum<0> =
    2 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const updateBody = {
    file_name: updatedFileName,
    order_in_article: updatedOrder,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: originalAttachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 8. Validate identity and ownership fields
  TestValidator.equals(
    "attachment id remains unchanged after update",
    updatedAttachment.id,
    originalAttachment.id,
  );
  TestValidator.equals(
    "attachment still belongs to the original article",
    updatedAttachment.discussion_board_article_id,
    article.id,
  );

  // 9. Validate updated fields
  TestValidator.equals(
    "file_name is updated to new value",
    updatedAttachment.file_name,
    updatedFileName,
  );
  TestValidator.equals(
    "order_in_article is updated to new value",
    updatedAttachment.order_in_article,
    updatedOrder,
  );

  // 10. Validate preserved fields (file_uri, file_size, content_type, status)
  TestValidator.equals(
    "file_uri is preserved after update",
    updatedAttachment.file_uri,
    originalAttachment.file_uri,
  );
  TestValidator.equals(
    "file_size is preserved after update",
    updatedAttachment.file_size,
    originalAttachment.file_size,
  );
  TestValidator.equals(
    "content_type is preserved after update",
    updatedAttachment.content_type,
    originalAttachment.content_type,
  );
  TestValidator.equals(
    "status is preserved when not changed in update",
    updatedAttachment.status,
    originalAttachment.status,
  );

  // 11. Validate timestamps and deleted_at
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedAttachment.updated_at,
    originalAttachment.updated_at,
  );

  TestValidator.predicate(
    "updated_at is equal or later than created_at",
    new Date(updatedAttachment.updated_at).getTime() >=
      new Date(updatedAttachment.created_at).getTime(),
  );

  TestValidator.equals(
    "deleted_at remains null or undefined after a normal update",
    updatedAttachment.deleted_at ?? null,
    originalAttachment.deleted_at ?? null,
  );
}
