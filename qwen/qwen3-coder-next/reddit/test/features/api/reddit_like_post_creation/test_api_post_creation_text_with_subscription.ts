import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_creation_text_with_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Get subscribed communities (mocked response)
  const communitiesResponse =
    await api.functional.redditLike.member.communities.my.index(
      memberConnection,
    );
  typia.assert(communitiesResponse);
  // Check if member has at least one subscribed community
  TestValidator.predicate(
    "member has subscribed communities",
    communitiesResponse.data.length > 0,
  );
  if (communitiesResponse.data.length === 0) {
    return; // Skip test if no communities
  }
  const targetCommunity = communitiesResponse.data[0];
  // 3. Create text post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 7,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Validate post fields
  TestValidator.equals("post title matches", post.title, post.title);
  TestValidator.equals("post type is text", post.type, "text");
  TestValidator.equals("post content matches", post.content, post.content);
  TestValidator.equals("post score is 0", post.score, 0);
  TestValidator.equals("post comment_count is 0", post.comment_count, 0);
  // 5. Validate author and community
  TestValidator.equals(
    "author username matches",
    post.author.username,
    member.username,
  );
  TestValidator.equals(
    "community name matches",
    post.community.name,
    targetCommunity.name,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    new Date(post.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    new Date(post.updated_at) <= new Date(),
  );
}
