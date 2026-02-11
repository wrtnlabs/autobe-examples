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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_member_post_vote_flip(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authorize
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberProfile);
  // Update connection with authentication token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberProfile.token.access,
  };
  // 2. Create a post (TEXT type with content)
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        type: "TEXT" as const,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const initialPostScore = post.voteScore;
  // 3. Member initially downvotes the post
  await api.functional.redditPlatform.member.posts.votes.updateVote(
    memberConnection,
    {
      postId: post.id,
      body: {
        voteType: "DOWNVOTE" as const,
      } satisfies IRedditPlatformPostVote.IUpdate,
    },
  );
  // 4. Verify post score is now -1 (downvoted)
  const postAfterDownvote =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: { title: "dummy" },
    } as any);
  // 5. Member flips vote to upvote
  const upvoteResult =
    await api.functional.redditPlatform.member.posts.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        body: {
          voteType: "UPVOTE" as const,
        } satisfies IRedditPlatformPostVote.IUpdate,
      },
    );
  typia.assert(upvoteResult);
  // 6. Verify final vote type is UPVOTE
  TestValidator.equals(
    "final vote type is UPVOTE",
    upvoteResult.vote_type,
    "UPVOTE",
  );
  // 7. Verify post score changed by +2 (from -1 to +1)
  const finalPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    { body: { title: "dummy" } } as any,
  );
  TestValidator.equals(
    "post score increased by 2",
    finalPost.voteScore,
    initialPostScore + 2,
  );
}
