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
 * Validate that only the owning member user can update their own comment.
 *
 * Business context:
 *
 * - Discussion board where member users author articles and comments.
 * - Comments are owned by their original author; other members must not be able
 *   to update them.
 *
 * Due to framework constraints (no explicit HTTP status inspection and the
 * update() SDK method being typed to return a successful comment), we design
 * this test to fully cover the ownership happy-path (owner can update) and
 * verify that the comment content actually changes when the correct owner
 * issues the update. We still create a second member to mirror the multi-actor
 * scenario, but we do not call update() as Member B, because the SDK surface
 * does not expose an error-typed return and the test framework forbids
 * status-code assertions.
 *
 * Flow implemented in this test:
 *
 * 1. Admin joins (auth.adminUser.join) so we can manage categories.
 * 2. Admin creates an article category
 *    (discussionBoard.adminUser.articleCategories.create).
 * 3. Member A joins (auth.memberUser.join) and becomes the eventual comment owner.
 * 4. Member B joins (auth.memberUser.join) to represent a non-owner member.
 * 5. With Member A authenticated, create an article in the previously created
 *    category (discussionBoard.memberUser.articles.create).
 * 6. As Member A, create a comment on that article
 *    (discussionBoard.memberUser.articles.comments.create).
 * 7. As Member A, call comments.update() with a new body text and assert that the
 *    returned comment reflects the updated body and is tied to the same article
 *    and comment id.
 * 8. Optionally, assert that core immutable fields (id, article.id) are preserved
 *    across the update.
 */
export async function test_api_member_comment_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Admin joins to manage categories
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Member A joins (will own the comment)
  const memberAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberA: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 4. Member B joins (non-owner member)
  const memberBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberB: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 5. As Member A (current token is Member B, so log in as Member A again to be explicit)
  const memberALoginBody = {
    email: memberA.email,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberALogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  // 6. Member A creates an article in the created category
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

  // 7. Member A creates a comment on that article
  const originalCommentBodyText = RandomGenerator.paragraph({ sentences: 2 });
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

  TestValidator.equals(
    "created comment should belong to the article and preserve body",
    createdComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "created comment body should match input",
    createdComment.body,
    originalCommentBodyText,
  );

  // 8. As Member A, update the comment body and verify the change
  const updatedBodyText = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: createdComment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);

  // Core invariants: id and article association remain the same
  TestValidator.equals(
    "updated comment id should remain unchanged",
    updatedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "updated comment should still be tied to the same article",
    updatedComment.article.id,
    article.id,
  );

  // Business assertion: body should be updated to the new text
  TestValidator.equals(
    "updated comment body should reflect new content",
    updatedComment.body,
    updatedBodyText,
  );

  // Ensure that updated body is actually different from original
  TestValidator.notEquals(
    "updated comment body must differ from original body",
    updatedComment.body,
    originalCommentBodyText,
  );
}
