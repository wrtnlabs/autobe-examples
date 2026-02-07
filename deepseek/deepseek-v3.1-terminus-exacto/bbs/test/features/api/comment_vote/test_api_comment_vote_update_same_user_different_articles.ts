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
 * Test the scenario where a user updates votes on comments across different articles
 * to validate proper relationship validation and user ownership checks.
 */
export async function test_api_comment_vote_update_same_user_different_articles(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create first article with a valid section ID (using a random UUID since sections are managed by admins)
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  // Create comment on first article
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Create vote on first article's comment
  const vote1 =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        params: { articleId: article1.id, commentId: comment1.id },
        body: {
          vote_type: "upvote" as const,
        } satisfies IDiscussionBoardCommentVote.ICreate,
      },
    );
  typia.assert(vote1);
  // Create second article
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  // Create comment on second article
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Create vote on second article's comment
  const vote2 =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        params: { articleId: article2.id, commentId: comment2.id },
        body: {
          vote_type: "downvote" as const,
        } satisfies IDiscussionBoardCommentVote.ICreate,
      },
    );
  typia.assert(vote2);
  // Update vote on first article's comment
  const updatedVote1 =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article1.id,
        commentId: comment1.id,
        voteId: vote1.id,
        body: {
          vote_type: "downvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote1);
  // Validate vote update
  TestValidator.equals("vote type updated", updatedVote1.vote_type, "downvote");
  TestValidator.equals("vote ID unchanged", updatedVote1.id, vote1.id);
  TestValidator.equals(
    "vote belongs to same comment",
    updatedVote1.comment.id,
    comment1.id,
  );
  TestValidator.equals(
    "vote belongs to same user",
    updatedVote1.user.id,
    user.id,
  );
  // Update vote on second article's comment
  const updatedVote2 =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article2.id,
        commentId: comment2.id,
        voteId: vote2.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote2);
  // Validate vote update
  TestValidator.equals("vote type updated", updatedVote2.vote_type, "upvote");
  TestValidator.equals("vote ID unchanged", updatedVote2.id, vote2.id);
  TestValidator.equals(
    "vote belongs to same comment",
    updatedVote2.comment.id,
    comment2.id,
  );
  TestValidator.equals(
    "vote belongs to same user",
    updatedVote2.user.id,
    user.id,
  );
  // Validate cross-article isolation - votes should not be mixed between articles
  TestValidator.notEquals(
    "votes from different articles have different IDs",
    vote1.id,
    vote2.id,
  );
  TestValidator.notEquals(
    "comments from different articles have different IDs",
    comment1.id,
    comment2.id,
  );
  TestValidator.notEquals(
    "articles have different IDs",
    article1.id,
    article2.id,
  );
  // Validate that vote updates maintain proper relationships
  TestValidator.predicate(
    "first vote updated timestamp should be newer",
    new Date(updatedVote1.updated_at) > new Date(vote1.updated_at),
  );
  TestValidator.predicate(
    "second vote updated timestamp should be newer",
    new Date(updatedVote2.updated_at) > new Date(vote2.updated_at),
  );
}
