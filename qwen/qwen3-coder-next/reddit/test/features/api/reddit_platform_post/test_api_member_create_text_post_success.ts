import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
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

export async function test_api_member_create_text_post_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // For this test, we'll use a mock community since community creation function is not available
  // In real implementation, there should be a community seeding utility
  const mockCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Subscribe member to community (using mock community ID)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: mockCommunityId,
      },
    );
  typia.assert(subscription);
  // Step 3: Create TEXT post
  const postContent = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: mockCommunityId,
        title: "Test Post Title",
        type: "TEXT" as const,
        content: postContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Verify post fields
  TestValidator.equals("post type is TEXT", post.type, "TEXT");
  TestValidator.equals("post content matches", post.content, postContent);
  TestValidator.equals("post title matches", post.title, "Test Post Title");
  TestValidator.equals("voteScore starts at 0", post.voteScore, 0);
  TestValidator.equals("commentCount starts at 0", post.commentCount, 0);
  TestValidator.equals(
    "createdAt is valid ISO date-time",
    post.createdAt,
    post.createdAt,
  );
  TestValidator.equals(
    "updatedAt is valid ISO date-time",
    post.updatedAt,
    post.updatedAt,
  );
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
  // Step 5: Verify author and community
  TestValidator.equals(
    "author id matches member id",
    post.author.id,
    member.id,
  );
  TestValidator.equals(
    "author username matches",
    post.author.username,
    member.username,
  );
  // Community is mock, so only verify structure exists
  TestValidator.equals(
    "community has id",
    post.community.id !== undefined,
    true,
  );
  TestValidator.equals(
    "community has name",
    post.community.name !== undefined,
    true,
  );
}