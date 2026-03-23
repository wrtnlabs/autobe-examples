import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 3. Member creates a comment using utility function
  // Since posts.create doesn't exist, we can't create posts directly
  // We'll need to work with the available endpoints
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(comment);
  // 4. Moderator upvotes the comment
  const voteResult =
    await api.functional.redditLike.moderator.comments.vote.update(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          value: 1,
        },
      },
    );
  typia.assert(voteResult);
  // 5. Validate vote result
  TestValidator.equals("vote result value", voteResult.value, 1);
  // 6. Verify comment vote score increased
  // Since we can't fetch the updated comment (no detail endpoint exists),
  // we'll validate that the vote was recorded by checking the vote result
  TestValidator.equals(
    "vote result indicates successful upvote",
    voteResult.value,
    1,
  );
  // 7. Note: We can't verify comment score increase or moderator karma increase
  // due to missing detail/profile endpoints in the API
  // In a complete implementation, we would fetch the updated comment and moderator profile
  TestValidator.predicate(
    "moderator has valid karma score",
    moderator.karma_score >= 0,
  );
}
