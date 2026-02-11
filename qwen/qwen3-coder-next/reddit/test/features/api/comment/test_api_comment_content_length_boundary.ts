import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_content_length_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post for comment testing
  // Generate valid UUID for communityId
  const communityId =
    RandomGenerator.alphaNumeric(8) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(4) +
    "-" +
    RandomGenerator.alphaNumeric(12);
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: communityId satisfies string & tags.Format<"uuid">,
        title: RandomGenerator.name(3),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Test: Create comment with exactly 10,000 characters (should succeed)
  // Generate exactly 10,000 characters using alphabets for reliable length
  const content10000 = RandomGenerator.alphabets(10000);
  const comment10000 =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: content10000 satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<10000>,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment10000);
  TestValidator.equals(
    "comment content length 10000",
    comment10000.content.length,
    10000,
  );
  // 4. Test: Create comment with 10,001 characters (should fail with validation error)
  const content10001 = content10000 + "X";
  await TestValidator.error("content exceeds max length", async () => {
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: content10001 satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<10000>,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  });
}
