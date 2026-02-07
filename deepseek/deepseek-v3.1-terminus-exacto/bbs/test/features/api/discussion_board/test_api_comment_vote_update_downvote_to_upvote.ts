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

export async function test_api_comment_vote_update_downvote_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create initial downvote
  const initialVote =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: "downvote" as const,
        } satisfies IDiscussionBoardCommentVote.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialVote);
  // Verify initial downvote was created
  TestValidator.equals(
    "initial vote type should be downvote",
    initialVote.vote_type,
    "downvote",
  );
  // Update vote from downvote to upvote
  const updatedVote =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validate vote type changed successfully
  TestValidator.equals(
    "vote type should be updated to upvote",
    updatedVote.vote_type,
    "upvote",
  );
  TestValidator.notEquals(
    "vote type should change from initial",
    updatedVote.vote_type,
    initialVote.vote_type,
  );
  // Validate vote ID remains the same
  TestValidator.equals(
    "vote ID should remain unchanged",
    updatedVote.id,
    initialVote.id,
  );
  // Validate timestamps updated
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedVote.updated_at,
    initialVote.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain same",
    updatedVote.created_at,
    initialVote.created_at,
  );
  // Validate vote belongs to authenticated user
  TestValidator.equals(
    "vote should belong to authenticated user",
    updatedVote.user.id,
    authorizedUser.id,
  );
  // Validate comment relationship
  TestValidator.equals(
    "comment ID should match",
    updatedVote.comment.id,
    comment.id,
  );
  // Article relationship validation removed since comment article property doesn't exist in ISummary
}
