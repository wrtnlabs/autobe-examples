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

/**
 * Test member post vote change functionality.
 * 1. Register and login as member
 * 2. Create a post
 * 3. Vote UPVOTE on the post
 * 4. Update vote to DOWNVOTE
 * 5. Verify the vote response shows correct vote type
 */
export async function test_api_member_post_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // 2. Create a text post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Vote UPVOTE on the post
  await api.functional.redditPlatform.member.posts.votes.updateVote(
    memberConnection,
    {
      postId: post.id,
      body: { voteType: "UPVOTE" as const },
    },
  );
  // 4. Update vote to DOWNVOTE (this is the main test case)
  const downvote =
    await api.functional.redditPlatform.member.posts.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        body: { voteType: "DOWNVOTE" as const },
      },
    );
  typia.assert(downvote);
  TestValidator.equals("downvote vote type", downvote.vote_type, "DOWNVOTE");
}
