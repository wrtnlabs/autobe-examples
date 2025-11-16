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
 * Validate basic flow of creating and then retrieving a single article
 * attachment.
 *
 * Business workflow:
 *
 * 1. An admin user registers (join) and becomes authenticated.
 * 2. The admin creates an article category.
 * 3. A member user registers (join) and becomes authenticated.
 * 4. The member creates an article under the created category.
 * 5. The member creates a file attachment for that article.
 * 6. The public attachment GET endpoint is called with the articleId and
 *    attachmentId.
 * 7. The test asserts that the fetched attachment metadata matches the created one
 *    and that discussion_board_article_id equals the parent article id,
 *    ensuring correct scoping.
 */
export async function test_api_article_single_attachment_retrieval_basic_flow(
  connection: api.IConnection,
) {
  // 1. Admin user joins (registration + authentication handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.discussion-board.test/join",
    referrer: "https://admin.discussion-board.test/",
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
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Member user joins (registration + authentication handled by SDK)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "192.168.0.10",
    href: "https://discussion-board.test/join",
    referrer: "https://discussion-board.test/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article under the created category
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

  // 5. Member creates an attachment for that article
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.discussion-board.test/files/" +
      RandomGenerator.alphaNumeric(16),
    file_name: `${RandomGenerator.paragraph({ sentences: 1 })}.txt`,
    content_type: "text/plain",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
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

  // Sanity check: created attachment is scoped to the correct article
  TestValidator.equals(
    "created attachment article id should match article.id",
    createdAttachment.discussion_board_article_id,
    article.id,
  );

  // 6. Retrieve the attachment via the public GET endpoint
  const fetchedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: createdAttachment.id,
    });
  typia.assert(fetchedAttachment);

  // 7. Assert that fetched metadata matches the created attachment
  TestValidator.equals(
    "fetched attachment id matches created attachment id",
    fetchedAttachment.id,
    createdAttachment.id,
  );
  TestValidator.equals(
    "fetched attachment discussion_board_article_id matches article.id",
    fetchedAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "fetched attachment file_uri matches created attachment file_uri",
    fetchedAttachment.file_uri,
    createdAttachment.file_uri,
  );
  TestValidator.equals(
    "fetched attachment file_name matches created attachment file_name",
    fetchedAttachment.file_name,
    createdAttachment.file_name,
  );
  TestValidator.equals(
    "fetched attachment content_type matches created attachment content_type",
    fetchedAttachment.content_type,
    createdAttachment.content_type,
  );
  TestValidator.equals(
    "fetched attachment file_size matches created attachment file_size",
    fetchedAttachment.file_size,
    createdAttachment.file_size,
  );
  TestValidator.equals(
    "fetched attachment order_in_article matches created attachment order_in_article",
    fetchedAttachment.order_in_article,
    createdAttachment.order_in_article,
  );
  TestValidator.equals(
    "fetched attachment status matches created attachment status",
    fetchedAttachment.status,
    createdAttachment.status,
  );

  TestValidator.predicate(
    "fetched attachment created_at should not be empty",
    fetchedAttachment.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched attachment updated_at should not be empty",
    fetchedAttachment.updated_at.length > 0,
  );
}
