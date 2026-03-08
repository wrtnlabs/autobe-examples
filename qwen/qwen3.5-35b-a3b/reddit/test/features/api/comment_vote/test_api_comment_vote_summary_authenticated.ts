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

export async function test_api_comment_vote_summary_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post for comments
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
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
  // 3. Create first comment
  const firstComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(firstComment);
  // 4. Cast upvote on first comment to create existing vote records
  await api.functional.redditPlatform.member.comments.votes.vote(
    memberConnection,
    {
      commentId: firstComment.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditPlatformComment.IVoteRequest,
    },
  );
  // 5. Create second comment with no votes
  const secondComment =
    await generate_random_reddit_platform_member_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(secondComment);
  // 6. Request vote summary for the second comment
  const voteSummary =
    await api.functional.redditPlatform.member.comments.votes.at(
      memberConnection,
      {
        commentId: secondComment.id,
      },
    );
  typia.assert(voteSummary);
  // 7. Validate vote summary response
  TestValidator.equals(
    "commentId matches requested comment",
    voteSummary.commentId,
    secondComment.id,
  );
  TestValidator.equals("upvote count is zero", voteSummary.upvoteCount, 0);
  TestValidator.equals("downvote count is zero", voteSummary.downvoteCount, 0);
  TestValidator.equals("score is zero", voteSummary.score, 0);
  TestValidator.equals("userVote is null", voteSummary.userVote, null);
  TestValidator.equals("total votes is zero", voteSummary.totalVotes, 0);
}
