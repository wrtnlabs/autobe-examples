import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

export async function test_api_comment_replies_retrieval_threaded_discussion(
  connection: api.IConnection,
) {
  // 1. Create a member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 2. Create an article to serve as parent context
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // 3. Create a parent comment on the article
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment should have thread depth 0",
    parentComment.thread_depth,
    0,
  );

  // 4. Create multiple reply comments to populate the replies list
  const replies: IDiscussionBoardComment[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const reply: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.comments.replies.createReply(
          connection,
          {
            commentId: parentComment.id,
            body: {
              content: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      return reply;
    },
  );

  // Validate all replies were created successfully
  for (const reply of replies) {
    typia.assert(reply);
    TestValidator.equals(
      "reply should reference parent comment",
      reply.parent_comment_id,
      parentComment.id,
    );
    TestValidator.equals(
      "reply should have thread depth 1",
      reply.thread_depth,
      1,
    );
  }

  // 5. Retrieve replies using the replies endpoint with pagination
  const repliesPage: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(repliesPage);

  // 6. Validate pagination information
  TestValidator.equals(
    "pagination should indicate first page",
    repliesPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    repliesPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should match created replies",
    repliesPage.pagination.records,
    5,
  );

  // 7. Validate all replies are present and correctly structured
  TestValidator.equals(
    "returned replies count should match expected",
    repliesPage.data.length,
    5,
  );

  // 8. Verify each reply has correct properties and author information
  for (const returnedReply of repliesPage.data) {
    typia.assert(returnedReply);
    TestValidator.equals(
      "each reply should belong to the parent comment article",
      returnedReply.discussion_board_article_id,
      article.id,
    );
    TestValidator.predicate(
      "each reply should have author information",
      returnedReply.author !== null && returnedReply.author !== undefined,
    );
    TestValidator.equals(
      "each reply should have thread depth 1",
      returnedReply.thread_depth,
      1,
    );
    TestValidator.predicate(
      "reply content should not be empty",
      returnedReply.content.length > 0,
    );
  }

  // 9. Test pagination with different page sizes
  const smallPageResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(smallPageResult);
  TestValidator.equals(
    "small page should have 2 items",
    smallPageResult.data.length,
    2,
  );
  TestValidator.equals(
    "total pages should be 3 for 5 items with limit 2",
    smallPageResult.pagination.pages,
    3,
  );

  // 10. Test chronological ordering (oldest first by default)
  TestValidator.predicate(
    "replies should be ordered chronologically",
    repliesPage.data[0].created_at <=
      repliesPage.data[repliesPage.data.length - 1].created_at,
  );
}
