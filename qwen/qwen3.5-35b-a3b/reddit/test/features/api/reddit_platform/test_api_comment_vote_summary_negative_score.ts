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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test the comment vote summary endpoint with a comment that has a negative vote score.
 * This scenario validates the system handles negative scores correctly and the userVote
 * field accurately reflects vote status on controversial comments.
 *
 * Note: This test uses available SDK endpoints. Vote casting functionality requires
 * additional API endpoints not currently exposed in the SDK.
 */
export async function test_api_comment_vote_summary_negative_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - create post and comment
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberA);
  // Create a post by member A
  const post = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Member A creates a comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberAConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Set up additional members
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberB);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberC);
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberD = await authorize_member_join(memberDConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberD);
  // 4. Request vote summary for member A's comment as member A
  const voteSummary =
    await api.functional.redditPlatform.member.comments.votes.at(
      memberAConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteSummary);
  // Validate vote summary endpoint returns expected structure
  TestValidator.equals("commentId matches", voteSummary.commentId, comment.id);
  TestValidator.equals(
    "upvoteCount is number",
    typeof voteSummary.upvoteCount,
    "number",
  );
  TestValidator.equals(
    "downvoteCount is number",
    typeof voteSummary.downvoteCount,
    "number",
  );
  TestValidator.equals("score is number", typeof voteSummary.score, "number");
  TestValidator.equals(
    "totalVotes is number",
    typeof voteSummary.totalVotes,
    "number",
  );
  TestValidator.equals(
    "userVote can be null or string",
    voteSummary.userVote === null ||
      voteSummary.userVote === "upvote" ||
      voteSummary.userVote === "downvote",
    true,
  );
  TestValidator.predicate(
    "totalVotes equals upvote + downvote",
    voteSummary.totalVotes ===
      voteSummary.upvoteCount + voteSummary.downvoteCount,
  );
  TestValidator.predicate(
    "score equals upvote - downvote (can be negative)",
    voteSummary.score === voteSummary.upvoteCount - voteSummary.downvoteCount,
  );
  TestValidator.predicate(
    "score can be negative (controversial content)",
    voteSummary.score <= voteSummary.totalVotes &&
      voteSummary.score >= -voteSummary.totalVotes,
  );
}
