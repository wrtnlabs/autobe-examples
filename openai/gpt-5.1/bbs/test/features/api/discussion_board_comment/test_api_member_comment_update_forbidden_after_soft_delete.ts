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

export async function test_api_member_comment_update_forbidden_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Create an admin user and obtain admin authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(1),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(admin);

  // 2. Create an article category as admin
  const categoryBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 3. Create a member user and switch authorization to member
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(1),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(member);

  // 4. As member, create an article under the category
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
  typia.assert<IDiscussionBoardArticle>(article);

  // 5. As member, create a comment on the article
  const originalCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const originalComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: originalCommentBody,
      },
    );
  typia.assert<IDiscussionBoardComment>(originalComment);

  // Basic relation checks
  TestValidator.equals(
    "original comment belongs to the created article",
    originalComment.article.id,
    article.id,
  );

  // Capture baseline timestamps
  const originalCreatedAt = originalComment.created_at;
  const originalUpdatedAt = originalComment.updated_at;

  // 6. Perform a normal successful update on the comment
  const updatedBodyText = RandomGenerator.paragraph({ sentences: 6 });

  const updateBody = {
    body: updatedBodyText,
  } satisfies IDiscussionBoardComment.IUpdate;

  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: originalComment.id,
        body: updateBody,
      },
    );
  typia.assert<IDiscussionBoardComment>(updatedComment);

  // Validate identity invariants
  TestValidator.equals(
    "updated comment id should remain the same",
    updatedComment.id,
    originalComment.id,
  );
  TestValidator.equals(
    "updated comment still belongs to the same article",
    updatedComment.article.id,
    article.id,
  );

  // Validate content change and timestamps
  TestValidator.equals(
    "updated comment body should reflect new text",
    updatedComment.body,
    updatedBodyText,
  );

  TestValidator.predicate(
    "updated_at should be same or after created_at",
    new Date(updatedComment.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );

  TestValidator.predicate(
    "updated_at should not be before prior updated_at",
    new Date(updatedComment.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 7. Negative case A: mismatched articleId with valid commentId
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating with mismatched articleId should fail",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.comments.update(
        connection,
        {
          articleId: randomArticleId,
          commentId: originalComment.id,
          body: updateBody,
        },
      );
    },
  );

  // 7. Negative case B: valid articleId with random commentId
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating with non-existent commentId should fail",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: randomCommentId,
          body: updateBody,
        },
      );
    },
  );
}
