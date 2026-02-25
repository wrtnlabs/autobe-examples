import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_retrieval_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article (using utility function)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // Test empty comment section
  const emptyConnection: api.IConnection = { host: connection.host };
  const emptyComments =
    await api.functional.discussionBoard.articles.comments.index(
      emptyConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(emptyComments);
  TestValidator.equals("empty comments data", emptyComments.data.length, 0);
  TestValidator.equals(
    "empty comments records",
    emptyComments.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty comments pages",
    emptyComments.pagination.pages,
    0,
  );
  // Create multiple comments (exceeding page limit) using utility function
  const commentCount = 55; // Exceeds default 50-comment limit
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies DeepPartial<IDiscussionBoardComment.ICreate>,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Test pagination - first page
  const firstPageConnection: api.IConnection = { host: connection.host };
  const firstPage =
    await api.functional.discussionBoard.articles.comments.index(
      firstPageConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 50);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    commentCount,
  );
  TestValidator.equals("first page pages", firstPage.pagination.pages, 2);
  TestValidator.equals("first page data count", firstPage.data.length, 50);
  // Test pagination - second page
  const secondPageConnection: api.IConnection = { host: connection.host };
  const secondPage =
    await api.functional.discussionBoard.articles.comments.index(
      secondPageConnection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 50,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page data count", secondPage.data.length, 5);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    commentCount,
  );
  // Verify chronological order (oldest first)
  const allComments = [...firstPage.data, ...secondPage.data];
  for (let i = 1; i < allComments.length; i++) {
    const prevDate = new Date(allComments[i - 1].created_at);
    const currDate = new Date(allComments[i].created_at);
    TestValidator.predicate(
      `comment ${i} is older than ${i + 1}`,
      prevDate <= currDate,
    );
  }
  // Verify author information
  allComments.forEach((comment, index) => {
    TestValidator.predicate(
      `comment ${index} has author id`,
      comment.author.id !== undefined,
    );
    TestValidator.predicate(
      `comment ${index} has author name`,
      comment.author.display_name !== undefined,
    );
    TestValidator.predicate(
      `comment ${index} has created at`,
      comment.created_at !== undefined,
    );
  });
  // Test boundary conditions - page 3 (should be empty)
  const thirdPageConnection: api.IConnection = { host: connection.host };
  const thirdPage =
    await api.functional.discussionBoard.articles.comments.index(
      thirdPageConnection,
      {
        articleId: article.id,
        body: {
          page: 3,
          limit: 50,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(thirdPage);
  TestValidator.equals("third page data", thirdPage.data.length, 0);
  // Test single comment retrieval with smaller limit
  const singleCommentConnection: api.IConnection = { host: connection.host };
  const singleCommentPage =
    await api.functional.discussionBoard.articles.comments.index(
      singleCommentConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(singleCommentPage);
  TestValidator.equals(
    "single comment page data",
    singleCommentPage.data.length,
    1,
  );
  TestValidator.equals(
    "single comment page records",
    singleCommentPage.pagination.records,
    commentCount,
  );
}
