import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_member_posts_votes_create_vote";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (voter) and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditPlatformMember.IAuthorized =
    await api.functional.redditPlatform.auth.member.join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberA);
  // 2. Create member B (post author) and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditPlatformMember.IAuthorized =
    await api.functional.redditPlatform.auth.member.join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberB);
  // 3. Member B creates a post in a community
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.create(memberBConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        communityId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 4. Member A creates UPVOTE vote on member B's post
  const vote: IRedditPlatformPostVote =
    await api.functional.redditPlatform.member.posts.votes.createVote(
      memberAConnection,
      {
        postId: post.id,
        body: {
          vote_type: "UPVOTE" as const,
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // 5. Validate vote record structure
  TestValidator.equals(
    "vote user_id matches member A",
    vote.user_id,
    memberA.id,
  );
  TestValidator.equals(
    "vote post_id matches created post",
    vote.post_id,
    post.id,
  );
  TestValidator.equals("vote type is UPVOTE", vote.vote_type, "UPVOTE");
  // 6. Re-fetch post to validate vote score was updated
  const updatedPost: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.create(memberBConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        communityId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(updatedPost);
  TestValidator.equals(
    "post vote_score increased by 1 after vote",
    post.voteScore + 1,
    updatedPost.voteScore,
  );
}