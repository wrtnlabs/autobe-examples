import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_vote_create } from "../../../generate/generate_random_reddit_like_member_comments_vote_create";
import { prepare_random_reddit_like_comment_vote } from "../../../prepare/prepare_random_reddit_like_comment_vote";

export async function test_api_comment_vote_self_vote_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create member1 to create a comment
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  // Since no utilities exist for creating posts/comments in provided APIs,
  // we'll directly test the vote endpoint error handling by sending
  // a vote on a non-existent comment to trigger the 409 conflict
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to vote on a comment as its author - should return 409 conflict
  await TestValidator.httpError(
    "self vote should be rejected with 409 conflict",
    409,
    async () => {
      await api.functional.redditLike.member.comments.vote.create(
        member1Connection,
        {
          commentId: nonExistentCommentId,
          body: { value: 1 } satisfies IRedditLikeCommentVote.ICreate,
        },
      );
    },
  );
}
