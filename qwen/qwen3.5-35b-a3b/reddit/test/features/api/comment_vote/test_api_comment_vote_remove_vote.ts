import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_comment_vote_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const signupConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(signupConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = memberAuth.token;
  // 2. Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Get existing posts in the community (we can't create posts via available API)
  const postsResponse = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(postsResponse);
  // If no posts exist, create one by creating a comment first (which requires a post)
  // Since we can't create posts, we'll use the community's owner to create a post
  // Actually, we need to find a way to have a post. Let's just fetch all posts and use one
  const allPostsResponse = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(allPostsResponse);
  if (allPostsResponse.data.length === 0) {
    throw new Error("No posts available to test comment voting");
  }
  const post = allPostsResponse.data[0];
  // 4. Create a comment on that post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  typia.assert(comment.author);
  // Capture the author's initial karma (same member in this test)
  const initialAuthorKarma = comment.author.karma_score;
  // 5. Cast an initial DOWNVOTE on the comment
  const downvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  typia.assert(downvote.comment);
  // Verify downvote decreased comment score to -1
  TestValidator.equals(
    "comment score after downvote",
    downvote.comment.vote_score,
    -1,
  );
  // 6. Remove the vote by setting vote_type=NULL
  const voteRemoval =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: null,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteRemoval);
  typia.assert(voteRemoval.comment);
  // 7. Verify comment score is back to 0
  TestValidator.equals(
    "comment score after vote removal",
    voteRemoval.comment.vote_score,
    0,
  );
  // 8. Verify vote type is NULL
  TestValidator.equals("vote type is NULL", voteRemoval.vote_type, null);
  // 9. Verify comment author's karma increased by 1 (reversing the downvote effect)
  const expectedAuthorKarma = initialAuthorKarma + 1;
  TestValidator.equals(
    "comment author karma after vote removal",
    voteRemoval.comment.author.karma_score,
    expectedAuthorKarma,
  );
  // 10. Verify member can cast a new vote on the same comment (confirming re-voting works)
  const newVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(newVote);
  typia.assert(newVote.comment);
  // Verify new vote is UPVOTE and score is 1
  TestValidator.equals("new vote type is UPVOTE", newVote.vote_type, "UPVOTE");
  TestValidator.equals(
    "comment score after new upvote",
    newVote.comment.vote_score,
    1,
  );
}
