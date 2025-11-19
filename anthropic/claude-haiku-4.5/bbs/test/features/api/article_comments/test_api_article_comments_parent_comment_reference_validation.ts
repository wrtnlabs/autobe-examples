import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_comments_parent_comment_reference_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article to serve as test context
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Test successful top-level comment creation with parentCommentId omitted
  const topLevelComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  TestValidator.predicate(
    "top-level comment has no parent",
    topLevelComment.parentComment === null ||
      topLevelComment.parentComment === undefined,
  );

  // Step 4: Create explicit top-level comment with parentCommentId explicitly null
  const explicitTopLevelComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
          parentCommentId: null,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(explicitTopLevelComment);
  TestValidator.predicate(
    "explicit null parentCommentId creates top-level comment",
    explicitTopLevelComment.parentComment === null ||
      explicitTopLevelComment.parentComment === undefined,
  );

  // Step 5: Test successful reply to parent comment with valid parentCommentId
  const parentCommentForReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentCommentForReply);

  const replyComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: parentCommentForReply.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply comment references correct parent",
    replyComment.parentComment?.id,
    parentCommentForReply.id,
  );

  // Step 6: Test error scenario - non-existent parentCommentId returns error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent parentCommentId should fail",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            parentCommentId: nonExistentId,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Step 7: Test nested comment replies are properly structured
  const parentCommentForNesting: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentCommentForNesting);

  const nestedReply: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: parentCommentForNesting.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  TestValidator.predicate(
    "nested reply has valid parent reference",
    nestedReply.parentComment !== null &&
      nestedReply.parentComment !== undefined,
  );

  // Step 8: Test parent comment must exist on same article
  const secondArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);

  // Try to reference a comment from the first article as parent in the second article
  await TestValidator.error(
    "parent comment from different article should fail",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: secondArticle.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            parentCommentId: topLevelComment.id,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Step 9: Validate response structure includes proper parent comment reference
  const finalValidationComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: topLevelComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(finalValidationComment);
  TestValidator.predicate(
    "final comment has parent comment structure",
    finalValidationComment.parentComment !== null &&
      finalValidationComment.parentComment !== undefined,
  );
  TestValidator.equals(
    "parent comment id matches",
    finalValidationComment.parentComment?.id,
    topLevelComment.id,
  );
}
