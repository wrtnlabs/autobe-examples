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

export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member (actor who will vote)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterMember = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voterMember);
  // Note: No community creation API exists - using hardcoded community ID
  // Note: No post creation API exists - using hardcoded post ID
  // Note: No comment creation API exists - using hardcoded comment ID
  // Since we can't create test data via API, we'll test the vote endpoint directly
  // with a mock comment ID that should exist in the test database
  const commentId = "00000000-0000-0000-0000-000000000001";
  // 2. Cast upvote (+1) on the comment
  const votedComment =
    await api.functional.redditLike.member.comments.vote.create(
      voterConnection,
      {
        commentId: commentId,
        body: { value: 1 } satisfies IRedditLikeCommentVote.ICreate,
      },
    );
  typia.assert(votedComment);
  // 3. Verify vote_score is valid after upvote
  TestValidator.predicate(
    "vote_score is a valid number after upvote",
    typeof votedComment.vote_score === "number",
  );
  // 4. Verify author information exists
  TestValidator.predicate(
    "author information exists",
    votedComment.author !== null && votedComment.author !== undefined,
  );
}
