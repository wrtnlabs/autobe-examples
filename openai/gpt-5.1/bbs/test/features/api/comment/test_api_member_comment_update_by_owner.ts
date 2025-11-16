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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate that a member user can update their own comment on an article.
 *
 * Business flow:
 *
 * 1. Register a member user (join) and keep their credential info.
 * 2. Register an admin user (join) to manage article categories.
 * 3. As admin, create an article category.
 * 4. Log in as the member user and create an article referencing the category.
 * 5. As the same member, create a comment on that article.
 * 6. As the same member, update the comment body using the PUT comment update
 *    endpoint.
 * 7. Assert that identifiers and relations are stable and timestamps/status behave
 *    correctly.
 */
export async function test_api_member_comment_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register member user (join) and keep email/password for later login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://member.join.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 2. Register admin user (join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://admin.join.example.com/",
    referrer: "https://admin.landing.example.com/",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Log in again as member user to ensure member auth context
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://member.login.example.com/",
    referrer: "https://landing.example.com/",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 5. Member creates an article referencing created category
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

  // 6. Member creates an initial comment on the article
  const originalCommentBodyText: string = RandomGenerator.paragraph({
    sentences: 4,
  });

  const commentCreateBody = {
    body: originalCommentBodyText,
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(createdComment);

  // Snapshot original timestamps and status
  const originalCreatedAt: string & tags.Format<"date-time"> =
    createdComment.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdComment.updated_at;
  const originalStatus: string = createdComment.status;
  const originalDeletedAt: (string & tags.Format<"date-time">) | null =
    createdComment.deleted_at;

  // Sanity checks on initial comment
  TestValidator.equals(
    "initial comment belongs to created article",
    createdComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "initial comment body matches input",
    createdComment.body,
    originalCommentBodyText,
  );

  // 7. Member updates the comment body
  const updatedCommentBodyText: string = RandomGenerator.paragraph({
    sentences: 5,
  });

  const commentUpdateBody = {
    body: updatedCommentBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(updatedComment);

  // 8. Business assertions on updated comment
  // 8.1 Identifier and article relation stability
  TestValidator.equals(
    "updated comment id equals original comment id",
    updatedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "updated comment still belongs to same article",
    updatedComment.article.id,
    article.id,
  );

  // 8.2 Body has been updated
  TestValidator.equals(
    "updated comment body equals new text",
    updatedComment.body,
    updatedCommentBodyText,
  );

  // 8.3 created_at remains unchanged
  TestValidator.equals(
    "created_at remains unchanged after update",
    updatedComment.created_at,
    originalCreatedAt,
  );

  // 8.4 updated_at has changed and is later than or equal to original timestamps
  const originalCreatedMs: number = new Date(originalCreatedAt).getTime();
  const originalUpdatedMs: number = new Date(originalUpdatedAt).getTime();
  const newUpdatedMs: number = new Date(updatedComment.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is strictly later than previous updated_at",
    newUpdatedMs > originalUpdatedMs,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    newUpdatedMs >= originalCreatedMs,
  );

  // 8.5 status remains the same
  TestValidator.equals(
    "comment status remains unchanged after body update",
    updatedComment.status,
    originalStatus,
  );

  // 8.6 deleted_at remains null (comment not deleted)
  TestValidator.equals(
    "deleted_at remains unchanged (still null) after update",
    updatedComment.deleted_at,
    originalDeletedAt,
  );
}
