import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_change_vote_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (will create the comment)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create Member B (will cast votes)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Member A creates a comment (comment_id needed for voting)
  // Note: Since posts API is not available in SDK, we'll create a comment
  // with a placeholder post_id that will be accepted by the system
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberAConnection,
    {
      body: {
        reddit_platform_post_id: randomPostId,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Store initial comment metrics
  const initialUpvotesCount = comment.upvotes_count;
  const initialDownvotesCount = comment.downvotes_count;
  const initialScore = comment.score;
  // 5. Member B casts an upvote on the comment
  const upvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberBConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 6. Verify upvote was recorded correctly
  TestValidator.equals("upvote direction initially", upvote.vote_type, "up");
  // 7. Member B changes vote to downvote (same comment, different member)
  const downvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberBConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "down",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 8. Verify downvote replaced upvote (same vote record updated)
  TestValidator.equals(
    "vote direction changed to down",
    downvote.vote_type,
    "down",
  );
  TestValidator.equals(
    "same vote record updated (not duplicated)",
    upvote.id,
    downvote.id,
  );
  // 9. Verify comment metrics after vote change
  // Note: We cannot re-fetch the comment, so we verify via the vote record response
  // The vote record should include updated comment metrics
  TestValidator.equals(
    "upvotes_count decreased by 1 (lost Member B's upvote)",
    downvote.comment.upvotes_count,
    initialUpvotesCount,
  );
  TestValidator.equals(
    "downvotes_count increased by 1 (gained Member B's downvote)",
    downvote.comment.downvotes_count,
    initialDownvotesCount + 1,
  );
  TestValidator.predicate(
    "score recalculated correctly",
    downvote.comment.score ===
      downvote.comment.upvotes_count - downvote.comment.downvotes_count,
  );
}
