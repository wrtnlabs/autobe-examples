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
 * Validate that a member user can create an attachment under their own article.
 *
 * Business flow:
 *
 * 1. Admin joins and becomes authenticated.
 * 2. Admin creates an article category.
 * 3. Member joins and becomes authenticated.
 * 4. Member creates an article in that category.
 * 5. Member creates an attachment under the created article.
 *
 * Validation points:
 *
 * - The attachment is successfully created and typed as
 *   IDiscussionBoardAttachment.
 * - Discussion_board_article_id in the attachment matches the article.id used as
 *   path parameter.
 * - Core metadata fields (file_uri, file_name, content_type, file_size,
 *   order_in_article, status) match the request payload.
 * - Created_at and updated_at are populated (validated by typia.assert), and
 *   deleted_at is null or undefined.
 */
export async function test_api_article_attachment_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 4. Member creates an article
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

  // 5. Member creates an attachment under the created article
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `attachment_${RandomGenerator.alphaNumeric(6)}.txt`,
    content_type: "text/plain",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // Business logic validations
  TestValidator.equals(
    "attachment should be linked to the created article",
    attachment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "file_uri should match request payload",
    attachment.file_uri,
    attachmentCreateBody.file_uri,
  );
  TestValidator.equals(
    "file_name should match request payload",
    attachment.file_name,
    attachmentCreateBody.file_name,
  );
  TestValidator.equals(
    "content_type should match request payload",
    attachment.content_type,
    attachmentCreateBody.content_type,
  );
  TestValidator.equals(
    "file_size should match request payload",
    attachment.file_size,
    attachmentCreateBody.file_size,
  );
  TestValidator.equals(
    "order_in_article should match request payload",
    attachment.order_in_article,
    attachmentCreateBody.order_in_article,
  );
  TestValidator.equals(
    "status should match request payload",
    attachment.status,
    attachmentCreateBody.status,
  );

  // Ensure newly created attachment is not deleted
  TestValidator.predicate(
    "deleted_at should be null or undefined for new attachment",
    attachment.deleted_at === null || attachment.deleted_at === undefined,
  );
}
