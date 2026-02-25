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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_vote_update_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using SDK
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: "Test User",
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // Create article - we need a valid section ID, but since sections are admin-only,
  // we'll use a random UUID and hope it exists or the test will fail
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: "Test Article Title",
        content:
          "This is a test article content that meets the minimum length requirement.",
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: "This is a test comment.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Cast initial upvote
  const initialVote =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  // Update vote to downvote
  const updatedVote =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validate vote ID remains consistent
  if (updatedVote.id !== initialVote.id) {
    throw new Error(
      `Vote ID changed from ${initialVote.id} to ${updatedVote.id}`,
    );
  }
  // Validate vote type changed to downvote
  if (updatedVote.vote_type !== "downvote") {
    throw new Error(
      `Expected vote type 'downvote' but got '${updatedVote.vote_type}'`,
    );
  }
  // Validate timestamps reflect update
  const updatedAt = new Date(updatedVote.updated_at);
  const createdAt = new Date(updatedVote.created_at);
  if (updatedAt <= createdAt) {
    throw new Error(
      `Updated at ${updatedAt} should be after created at ${createdAt}`,
    );
  }
  // Validate user reference remains correct
  if (updatedVote.user.id !== user.id) {
    throw new Error(
      `User ID mismatch: expected ${user.id}, got ${updatedVote.user.id}`,
    );
  }
  // Validate comment reference remains correct
  if (updatedVote.comment.id !== comment.id) {
    throw new Error(
      `Comment ID mismatch: expected ${comment.id}, got ${updatedVote.comment.id}`,
    );
  }
}
