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

export async function test_api_comment_vote_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Reset connection headers for authenticated API calls
  userConnection.headers = { Authorization: user.token.access };
  // Create article - need valid section ID
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment on the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Cast vote on the comment
  const voteInput: IDiscussionBoardCommentVote.IUpdate = {
    vote_type: "upvote",
  };
  const createdVote =
    await api.functional.discussionBoard.user.articles.comments.votes.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: voteInput,
      },
    );
  typia.assert(createdVote);
  // Retrieve the vote using authorized connection
  const retrievedVote =
    await api.functional.discussionBoard.articles.comments.votes.at(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedVote);
  // Validate vote data
  TestValidator.equals("vote type matches", retrievedVote.vote_type, "upvote");
  TestValidator.equals("vote id matches", retrievedVote.id, createdVote.id);
  TestValidator.equals("user id matches", retrievedVote.user.id, user.id);
  TestValidator.equals(
    "comment id matches",
    retrievedVote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "article id matches",
    article.id,
    article.id,
  );
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(new Date(retrievedVote.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(new Date(retrievedVote.updated_at).getTime()),
  );
  TestValidator.equals(
    "user display name matches",
    retrievedVote.user.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedVote.comment.content,
    comment.content,
  );
  TestValidator.equals(
    "article title matches",
    article.title,
    article.title,
  );
}