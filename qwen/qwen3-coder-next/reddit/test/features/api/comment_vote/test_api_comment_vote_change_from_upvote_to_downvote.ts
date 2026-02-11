import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comment_votes_create } from "../../../generate/generate_random_reddit_platform_member_comment_votes_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a comment for voting
  // Since there's no comments.create API available, I'll use the generate utility
  // But first, I need to create a mock comment for testing
  // Since we don't have access to create posts/comments, I'll use the available vote API
  // with a randomly generated comment_id and then test the vote change functionality
  // Generate a random comment ID (this is a simplification since we can't create actual comments)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member upvotes the comment
  const upvote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("upvote vote_type", upvote.vote_type, "UPVOTE");
  const originalScore = upvote.vote_score;
  // 4. Member changes vote to downvote
  const downvote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "downvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 5. Verify vote record is updated
  TestValidator.equals("downvote vote_type", downvote.vote_type, "DOWNVOTE");
  // 6. Verify comment score changed correctly (from +1 to -1 = -2 change)
  TestValidator.equals(
    "comment vote score reflects -2 change",
    downvote.vote_score,
    originalScore - 2,
  );
}
