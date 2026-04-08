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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_user_stats_excludes_deleted_content(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test user statistics accuracy for active content by validating counts
   * match created items.
   *
   * Validates that the user statistics endpoint correctly counts active posts,
   * comments, and communities. Since soft-delete functionality is not exposed
   * through the available SDK, this test confirms stats accuracy with active
   * content by verifying counts match the number of items created.
   *
   * 1. Member registration and authentication
   * 2. Community creation and ownership tracking
   * 3. Post creation and counting
   * 4. Comment creation and counting
   * 5. Stats retrieval and validation
   */
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name() + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create one community owned by the member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name() + "_" + RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create 4 posts authored by the member
  const posts = await Promise.all(ArrayUtil.repeat(4, async (_index) => {
    return await api.functional.redditPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text" as const,
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  }));
  posts.forEach((post) => typia.assert(post));
  // 4. Create 3 comments authored by the member
  const comments = await Promise.all(ArrayUtil.repeat(3, async (_index) => {
    return await api.functional.redditPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          reddit_platform_post_id: posts[0].id,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  }));
  comments.forEach((comment) => typia.assert(comment));
  // 5. Retrieve stats and validate active content counts
  const stats =
    await api.functional.redditPlatform.member.users.me.stats(memberConnection);
  typia.assert(stats);
  // Validate stats match created content
  TestValidator.equals("post count", stats.post_count, 4);
  TestValidator.equals("comment count", stats.comment_count, 3);
  TestValidator.equals("community count", stats.community_count, 1);
}