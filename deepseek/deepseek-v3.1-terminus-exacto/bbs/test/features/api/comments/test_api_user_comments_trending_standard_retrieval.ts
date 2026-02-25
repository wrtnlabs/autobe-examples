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

export async function test_api_user_comments_trending_standard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple user connections
  const adminConnection: api.IConnection = { host: connection.host };
  const user1Connection: api.IConnection = { host: connection.host };
  const user2Connection: api.IConnection = { host: connection.host };
  const user3Connection: api.IConnection = { host: connection.host };
  // Register and authenticate users
  const admin = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Admin User",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(admin);
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "User One",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "User Two",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  const user3 = await authorize_user_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "User Three",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user3);
  // Create articles with different users
  const article1 = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    user2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article2);
  // Create multiple comments with different engagement levels
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      user2Connection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_discussion_board_user_articles_comments_create(
      user3Connection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment3);
  // Cast votes to generate engagement data
  await api.functional.discussionBoard.user.articles.comments.votes.update(
    user1Connection,
    {
      articleId: article1.id,
      commentId: comment2.id,
      body: {
        vote_type: "upvote",
      } satisfies IDiscussionBoardCommentVote.IUpdate,
    },
  );
  await api.functional.discussionBoard.user.articles.comments.votes.update(
    user2Connection,
    {
      articleId: article1.id,
      commentId: comment2.id,
      body: {
        vote_type: "upvote",
      } satisfies IDiscussionBoardCommentVote.IUpdate,
    },
  );
  await api.functional.discussionBoard.user.articles.comments.votes.update(
    user3Connection,
    {
      articleId: article1.id,
      commentId: comment2.id,
      body: {
        vote_type: "upvote",
      } satisfies IDiscussionBoardCommentVote.IUpdate,
    },
  );
  await api.functional.discussionBoard.user.articles.comments.votes.update(
    user1Connection,
    {
      articleId: article1.id,
      commentId: comment1.id,
      body: {
        vote_type: "downvote",
      } satisfies IDiscussionBoardCommentVote.IUpdate,
    },
  );
  await api.functional.discussionBoard.user.articles.comments.votes.update(
    user2Connection,
    {
      articleId: article2.id,
      commentId: comment3.id,
      body: {
        vote_type: "upvote",
      } satisfies IDiscussionBoardCommentVote.IUpdate,
    },
  );
  // Test trending comments retrieval
  const trendingComments =
    await api.functional.discussionBoard.user.comments.trending(connection);
  typia.assert(trendingComments);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof trendingComments.pagination,
    "object",
  );
  TestValidator.predicate(
    "has current page",
    trendingComments.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", trendingComments.pagination.limit >= 0);
  TestValidator.predicate(
    "has records count",
    trendingComments.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    trendingComments.pagination.pages >= 0,
  );
  // Validate comments array structure
  TestValidator.equals(
    "has data array",
    Array.isArray(trendingComments.data),
    true,
  );
  if (trendingComments.data.length > 0) {
    const trendingComment = trendingComments.data[0];
    // Validate trending comment structure
    TestValidator.predicate("has id", typeof trendingComment.id === "string");
    TestValidator.predicate(
      "has content",
      typeof trendingComment.content === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof trendingComment.created_at === "string",
    );
    TestValidator.predicate(
      "has author info",
      typeof trendingComment.author === "object",
    );
    TestValidator.predicate(
      "has article info",
      typeof trendingComment.article === "object",
    );
    TestValidator.predicate(
      "has upvotes count",
      typeof trendingComment.upvotes === "number",
    );
    TestValidator.predicate(
      "has downvotes count",
      typeof trendingComment.downvotes === "number",
    );
    TestValidator.predicate(
      "has trending score",
      typeof trendingComment.trending_score === "number",
    );
    // Validate author structure
    TestValidator.predicate(
      "author has id",
      typeof trendingComment.author.id === "string",
    );
    TestValidator.predicate(
      "author has display_name",
      typeof trendingComment.author.display_name === "string",
    );
    TestValidator.predicate(
      "author has created_at",
      typeof trendingComment.author.created_at === "string",
    );
    // Validate article structure
    TestValidator.predicate(
      "article has id",
      typeof trendingComment.article.id === "string",
    );
    TestValidator.predicate(
      "article has title",
      typeof trendingComment.article.title === "string",
    );
    TestValidator.predicate(
      "article has status",
      typeof trendingComment.article.status === "string",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof trendingComment.article.created_at === "string",
    );
    TestValidator.predicate(
      "article has author info",
      typeof trendingComment.article.author === "object",
    );
    TestValidator.predicate(
      "article has section info",
      typeof trendingComment.article.section === "object",
    );
  }
  // Validate trending order (if multiple comments exist)
  if (trendingComments.data.length > 1) {
    for (let i = 0; i < trendingComments.data.length - 1; i++) {
      TestValidator.predicate(
        `trending score descending order ${i}`,
        trendingComments.data[i].trending_score >=
          trendingComments.data[i + 1].trending_score,
      );
    }
  }
  // Validate that non-negative voting counts
  for (const comment of trendingComments.data) {
    TestValidator.predicate("upvotes non-negative", comment.upvotes >= 0);
    TestValidator.predicate("downvotes non-negative", comment.downvotes >= 0);
    TestValidator.predicate(
      "trending score non-negative",
      comment.trending_score >= 0,
    );
  }
}
