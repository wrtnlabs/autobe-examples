import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_comments_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated member for content creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe member to the community (required before posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create multiple comments on the post
  const comments = await ArrayUtil.asyncRepeat(5, async () => {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          params: {
            postId: post.id,
          },
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Execute: Call endpoint as unauthenticated guest (base connection without authorization)
  const result = await api.functional.communityPlatform.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        sort: null,
        authorId: null,
        cursor: null,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(result);
  // 7. Validate: Comments are accessible without authentication
  TestValidator.predicate(
    "guest can retrieve comments without authentication",
    result.data.length > 0,
  );
  // 8. Validate: All created comments are visible
  TestValidator.predicate(
    "all comments are visible to guest",
    result.data.length >= comments.length,
  );
  // 9. Validate: Comments have correct structure with author info
  for (const comment of result.data) {
    TestValidator.predicate(
      "comment has author information",
      comment.author !== null && comment.author.id !== undefined,
    );
    TestValidator.equals(
      "comment has correct post reference",
      comment.post.id,
      post.id,
    );
  }
  // 10. Validate: Pagination metadata is correctly populated
  TestValidator.predicate(
    "pagination current page is set",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is set",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is set",
    result.pagination.records >= comments.length,
  );
}
