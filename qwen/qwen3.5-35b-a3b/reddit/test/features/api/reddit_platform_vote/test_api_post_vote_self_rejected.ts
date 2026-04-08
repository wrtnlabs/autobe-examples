import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_self_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get auth
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community for the test post
  // This will be used as the community_id for the post we create
  // We'll create a temporary community using the system's community creation logic
  // For E2E testing, we need a valid community - using generated UUID
  const testCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a post as this member in the test community
  // The post will be created successfully since member owns the community (or system allows)
  const testPost = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: testCommunityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(testPost);
  // 4. Attempt to vote on the post they just created (self-voting attempt)
  const voteBody = {
    vote_type: "up" as const,
  } satisfies IRedditPlatformPostVote.ICreate;
  // 5. Validate that self-vote is rejected with 409 Conflict
  // This enforces the business rule that members cannot vote on their own posts
  await TestValidator.httpError(
    "self-vote on own post should return 409 Conflict",
    [409],
    async () => {
      await api.functional.redditPlatform.member.posts.vote(memberConnection, {
        postId: testPost.id,
        body: voteBody,
      });
    },
  );
}
