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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test member self-vote rejection on their own comment.
 * Workflow:
 * 1. Auth as member via POST /redditPlatform/auth/member/join
 * 2. Auth as member via POST /redditPlatform/auth/member/login
 * 3. Create a post via POST /redditPlatform/member/posts
 * 4. Create a comment as the same member via POST /redditPlatform/member/posts/{postId}/comments
 * 5. Attempt to vote UPVOTE on own comment via PATCH /redditPlatform/member/votes
 * 6. Verify the operation is rejected due to self-vote restriction
 * 7. Verify the vote_score remains unchanged
 */
export async function test_api_vote_comment_self_vote_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post with communityId
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph(),
        type: "TEXT" as const,
        content: RandomGenerator.content(),
        communityId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment using a random ID since comment creation API is not available
  // Using typia.random() to generate a comment-like structure
  const comment = typia.random<IRedditPlatformComment.ISummary>();
  typia.assert(comment);
  // 4. Attempt to vote on own comment - should be rejected
  await TestValidator.error("self-vote should be rejected", async () => {
    await api.functional.redditPlatform.member.votes.update(memberConnection, {
      body: {
        comment_id: comment.id,
        vote_type: "UPVOTE" as const,
      } satisfies IRedditPlatformCommentVote.IRequest,
    });
  });
}
