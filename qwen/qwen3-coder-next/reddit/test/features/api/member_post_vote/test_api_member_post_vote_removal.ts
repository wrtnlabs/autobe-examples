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

export async function test_api_member_post_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a post
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.name(3),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 3. Vote on the post (UPVOTE)
  const voteUp =
    await api.functional.redditPlatform.member.posts.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        body: { voteType: "UPVOTE" },
      },
    );
  typia.assert(voteUp);
  // 4. Verify vote was recorded
  TestValidator.equals("vote type is UPVOTE", voteUp.vote_type, "UPVOTE");
  // 5. Remove vote (NONE)
  const voteNone =
    await api.functional.redditPlatform.member.posts.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        body: { voteType: "NONE" },
      },
    );
  typia.assert(voteNone);
  // 6. Verify vote was removed
  TestValidator.equals("vote type is NONE", voteNone.vote_type, "NONE");
}
