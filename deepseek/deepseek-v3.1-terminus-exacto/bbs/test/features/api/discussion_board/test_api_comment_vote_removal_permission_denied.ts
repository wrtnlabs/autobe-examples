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
 * Test that a user cannot remove a vote that belongs to another user.
 * This scenario validates the authorization logic that prevents unauthorized vote removal.
 * The test demonstrates that when a different user attempts to remove a vote they don't own,
 * the system correctly denies permission and maintains vote integrity.
 */
export async function test_api_comment_vote_removal_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first user (vote owner)
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(firstUser);
  // Step 2: Create an article as first user
  const article = await generate_random_discussion_board_user_articles_create(
    firstUserConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Create a comment on the article as first user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      firstUserConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // Step 4: Create a vote on the comment as first user
  const vote =
    await generate_random_discussion_board_user_articles_comments_votes_create(
      firstUserConnection,
      {
        params: { articleId: article.id, commentId: comment.id },
      },
    );
  typia.assert(vote);
  // Step 5: Create and authenticate second user (unauthorized user)
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(secondUser);
  // Step 6: Attempt to remove the vote using second user (should fail)
  await TestValidator.error(
    "unauthorized vote removal should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.votes.erase(
        secondUserConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    },
  );
  // The test is complete - we've validated that unauthorized removal fails
  // Since there's no API to retrieve a specific vote, we rely on the error test
  // to validate that the authorization logic is working correctly
}
