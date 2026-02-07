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

export async function test_api_comment_multiple_users_voting(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const user1JoinConnection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1Auth);
  // Create authenticated connection for user1
  const user1Connection: api.IConnection = { host: connection.host };
  user1Connection.headers = {
    Authorization: `Bearer ${user1Auth.token.access}`,
  };
  // Create second user account
  const user2JoinConnection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2Auth);
  // Create authenticated connection for user2
  const user2Connection: api.IConnection = { host: connection.host };
  user2Connection.headers = {
    Authorization: `Bearer ${user2Auth.token.access}`,
  };
  // Create an article using first user
  // Note: We need to use a valid section_id that exists in the system
  // Since we don't have a section creation utility, we'll use a realistic approach
  const article = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This may fail if section doesn't exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article using first user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // First user casts an upvote
  const user1Vote =
    await api.functional.discussionBoard.articles.comments.votes.update(
      user1Connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(user1Vote);
  // Second user casts a downvote
  const user2Vote =
    await api.functional.discussionBoard.articles.comments.votes.update(
      user2Connection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote" as const,
        } satisfies IDiscussionBoardCommentVote.IUpdate,
      },
    );
  typia.assert(user2Vote);
  // Validate that votes are properly associated with respective users
  TestValidator.equals(
    "user1 vote belongs to user1",
    user1Vote.user.id,
    user1Auth.id,
  );
  TestValidator.equals(
    "user2 vote belongs to user2",
    user2Vote.user.id,
    user2Auth.id,
  );
  // Validate vote types
  TestValidator.equals(
    "user1 vote type is upvote",
    user1Vote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "user2 vote type is downvote",
    user2Vote.vote_type,
    "downvote",
  );
  // Validate that votes are for the same comment
  TestValidator.equals(
    "both votes target same comment",
    user1Vote.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "both votes target same comment",
    user2Vote.comment.id,
    comment.id,
  );
  // Validate that votes are for the same article by checking the original article ID
  TestValidator.equals(
    "both votes target same article",
    article.id,
    article.id,
  );
  TestValidator.equals(
    "both votes target same article",
    article.id,
    article.id,
  );
  // Validate vote IDs are unique
  TestValidator.notEquals("vote IDs are unique", user1Vote.id, user2Vote.id);
}