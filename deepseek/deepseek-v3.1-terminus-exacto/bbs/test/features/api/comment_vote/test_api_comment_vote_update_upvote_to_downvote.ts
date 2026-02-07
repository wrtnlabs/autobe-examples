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

export async function test_api_comment_vote_update_upvote_to_downvote(
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
  // Create an article using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        status: "published" as const,
      } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // Create a comment on the article using utility function
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<IDiscussionBoardComment.ICreate>,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create initial upvote using utility function
  const initialVote =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: "upvote" as const,
        } satisfies DeepPartial<IDiscussionBoardCommentVote.ICreate>,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialVote);
  TestValidator.equals(
    "initial vote type should be upvote",
    initialVote.vote_type,
    "upvote",
  );
  // Update vote from upvote to downvote
  const updatedVote =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          vote_type: "downvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validate the vote was successfully updated
  TestValidator.equals(
    "vote type should be updated to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote ID should remain the same",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "user ID should remain the same",
    updatedVote.user.id,
    user.id,
  );
  TestValidator.equals(
    "comment ID should remain the same",
    updatedVote.comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedVote.updated_at) > new Date(initialVote.created_at),
  );
}
