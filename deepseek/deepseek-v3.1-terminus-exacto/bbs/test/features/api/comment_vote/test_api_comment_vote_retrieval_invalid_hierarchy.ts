import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_votes_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_votes_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_vote } from "../../../prepare/prepare_random_discussion_board_comment_vote";

/**
 * Test vote retrieval with mismatched hierarchy relationships.
 * Create separate articles and comments, then attempt to retrieve a vote using mismatched
 * article-comment-vote relationships. Verify the system properly validates the hierarchical
 * relationship and returns appropriate error when vote does not belong to the specified
 * comment/article combination.
 */
export async function test_api_comment_vote_retrieval_invalid_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for content creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create first article
  const firstArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "published" as const,
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(firstArticle);
  // Add comment to first article
  const firstComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: firstArticle.id,
        },
      },
    );
  typia.assert(firstComment);
  // Cast vote on first article's comment
  const firstVote =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
        } satisfies IDiscussionBoardCommentVote.ICreate,
        params: {
          articleId: firstArticle.id,
          commentId: firstComment.id,
        },
      },
    );
  typia.assert(firstVote);
  // Create second article
  const secondArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          status: "published" as const,
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);
  // Add comment to second article
  const secondComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: secondArticle.id,
        },
      },
    );
  typia.assert(secondComment);
  // Cast vote on second article's comment
  const secondVote =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: RandomGenerator.pick(["upvote", "downvote"] as const),
        } satisfies IDiscussionBoardCommentVote.ICreate,
        params: {
          articleId: secondArticle.id,
          commentId: secondComment.id,
        },
      },
    );
  typia.assert(secondVote);
  // Attempt to retrieve vote from first article using second article's comment ID
  // This should fail due to invalid hierarchy
  await TestValidator.error(
    "retrieve vote with mismatched hierarchy",
    async () => {
      await api.functional.discussionBoard.articles.comments.votes.at(
        userConnection,
        {
          articleId: firstArticle.id,
          commentId: secondComment.id, // Wrong comment ID for this article
          voteId: firstVote.id,
        },
      );
    },
  );
  // Attempt to retrieve vote from second article using first article's comment ID
  // This should also fail due to invalid hierarchy
  await TestValidator.error(
    "retrieve vote with mismatched hierarchy reversed",
    async () => {
      await api.functional.discussionBoard.articles.comments.votes.at(
        userConnection,
        {
          articleId: secondArticle.id,
          commentId: firstComment.id, // Wrong comment ID for this article
          voteId: secondVote.id,
        },
      );
    },
  );
  // Verify that valid hierarchy retrieval works for both articles
  const validFirstVote =
    await api.functional.discussionBoard.articles.comments.votes.at(
      userConnection,
      {
        articleId: firstArticle.id,
        commentId: firstComment.id,
        voteId: firstVote.id,
      },
    );
  typia.assert(validFirstVote);
  TestValidator.equals(
    "valid first vote retrieval",
    validFirstVote.id,
    firstVote.id,
  );
  const validSecondVote =
    await api.functional.discussionBoard.articles.comments.votes.at(
      userConnection,
      {
        articleId: secondArticle.id,
        commentId: secondComment.id,
        voteId: secondVote.id,
      },
    );
  typia.assert(validSecondVote);
  TestValidator.equals(
    "valid second vote retrieval",
    validSecondVote.id,
    secondVote.id,
  );
}