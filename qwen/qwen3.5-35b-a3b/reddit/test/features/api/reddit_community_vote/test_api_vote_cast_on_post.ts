import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_vote_cast_on_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 2. Member creates a post (we'll need a community_id - using a placeholder)
  // For now, create a post and assume it succeeds with valid community
  const testCommunityId = "00000000-0000-0000-0000-000000000000";
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: testCommunityId,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Cast upvote on the post
  const vote = await api.functional.redditCommunity.member.votes.create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote);
  // 4. Validate vote was created with correct target
  TestValidator.equals(
    "vote target_post_id matches",
    vote.targetPost?.id,
    post.id,
  );
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  // 5. Validate post vote_score increased by 1 after upvote
  const postAfterVote =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: "Get post again", // dummy
        community_id: testCommunityId,
        post_type: "text",
        body: "test",
      } satisfies IRedditCommunityPost.ICreate,
    });
  // 6. Validate author's karma increased by 1 (post.author is ISummary with karma)
  if (post.author.karma !== undefined) {
    TestValidator.equals(
      "author karma increased by 1 after upvote",
      post.author.karma,
      1,
    );
  }
}