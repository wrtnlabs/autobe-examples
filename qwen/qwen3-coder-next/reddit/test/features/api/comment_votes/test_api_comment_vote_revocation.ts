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

export async function test_api_comment_vote_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize member to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Generate a random comment ID for voting (since we can't create comments without API)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 2. First vote: upvote the comment
  const firstVote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(firstVote);
  // 3. Verify first vote was created with upvote
  TestValidator.equals("first vote type", firstVote.vote_type, "upvote");
  const initialScore = firstVote.vote_score;
  // 4. Second vote: click same upvote again (revocation)
  const secondVote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(secondVote);
  // 5. Verify vote was removed and score reverted by -1
  TestValidator.equals("second vote type", secondVote.vote_type, "none");
  TestValidator.equals(
    "score reverted",
    secondVote.vote_score,
    initialScore - 1,
  );
  // 6. Third vote: try upvote again (should create fresh vote)
  const thirdVote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(thirdVote);
  // 7. Verify fresh vote was created
  TestValidator.equals("third vote type", thirdVote.vote_type, "upvote");
  TestValidator.equals("new vote score", thirdVote.vote_score, initialScore);
  TestValidator.notEquals("new vote ID differs", thirdVote.id, firstVote.id);
}
