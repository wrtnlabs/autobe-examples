import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
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

export async function test_api_user_comments_trending_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create multiple articles to host comments
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 5; i++) {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // Generate sufficient comments to exceed pagination thresholds
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < 25; i++) {
    const article = RandomGenerator.pick(articles);
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
    // Apply varying vote patterns to create trending score diversity
    const voteType = RandomGenerator.pick(["upvote", "downvote"] as const);
    const vote =
      await api.functional.discussionBoard.user.articles.comments.votes.update(
        userConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            vote_type: voteType,
          } satisfies IDiscussionBoardCommentVote.IUpdate,
        },
      );
    typia.assert(vote);
  }
  // Test trending endpoint (no pagination parameters supported in current API)
  const trendingResult =
    await api.functional.discussionBoard.user.comments.trending(userConnection);
  typia.assert(trendingResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination metadata exists",
    typeof trendingResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    trendingResult.pagination.current >= 1,
  );
  TestValidator.predicate("has limit", trendingResult.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    trendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    trendingResult.pagination.pages >= 0,
  );
  // Validate trending comment structure
  if (trendingResult.data.length > 0) {
    const trendingComment = trendingResult.data[0];
    TestValidator.equals(
      "trending comment has id",
      typeof trendingComment.id,
      "string",
    );
    TestValidator.equals(
      "trending comment has content",
      typeof trendingComment.content,
      "string",
    );
    TestValidator.equals(
      "trending comment has author",
      typeof trendingComment.author,
      "object",
    );
    TestValidator.equals(
      "trending comment has article",
      typeof trendingComment.article,
      "object",
    );
    TestValidator.predicate("has upvotes count", trendingComment.upvotes >= 0);
    TestValidator.predicate(
      "has downvotes count",
      trendingComment.downvotes >= 0,
    );
    TestValidator.predicate(
      "has trending score",
      trendingComment.trending_score >= 0,
    );
  }
  // Test edge case: empty result set
  const emptyConnection: api.IConnection = { host: connection.host };
  const emptyUser = await authorize_user_join(emptyConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(emptyUser);
  const emptyResult =
    await api.functional.discussionBoard.user.comments.trending(
      emptyConnection,
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data",
    emptyResult.data.length,
    0,
  );
}
