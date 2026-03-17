import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_retrieval_public_access_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create multiple comments
  const commentCount = 5;
  const comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 6. Test guest access - use base connection (no auth)
  const guestConnection: api.IConnection = { host: connection.host };
  // Test default sorting (best)
  const bestComments =
    await api.functional.communityPlatform.posts.comments.index(
      guestConnection,
      {
        postId: post.id,
        body: {
          sort: "best" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestComments);
  TestValidator.equals(
    "guest can retrieve all comments",
    bestComments.data.length,
    commentCount,
  );
  TestValidator.equals(
    "guest gets pagination info",
    bestComments.pagination.records,
    commentCount,
  );
  // Test each comment's public fields are accessible
  for (const comment of bestComments.data) {
    TestValidator.predicate(
      "comment has public content",
      comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has author info",
      comment.author !== null && comment.author.username.length > 0,
    );
    TestValidator.predicate(
      "comment has valid vote score",
      typeof comment.voteScore === "number",
    );
    TestValidator.predicate(
      "comment has valid timestamps",
      comment.createdAt.length > 0 && comment.updatedAt.length > 0,
    );
  }
  // Test new sorting
  const newComments =
    await api.functional.communityPlatform.posts.comments.index(
      guestConnection,
      {
        postId: post.id,
        body: {
          sort: "new" as const,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newComments);
  TestValidator.equals(
    "new sorting returns all comments",
    newComments.data.length,
    commentCount,
  );
  // Test pagination
  const pageSize = 2;
  const firstPage = await api.functional.communityPlatform.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: {
        sort: "best" as const,
        page: 1,
        limit: pageSize,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page returns limited comments",
    firstPage.data.length,
    pageSize,
  );
  TestValidator.predicate(
    "pagination total is correct",
    firstPage.pagination.records === commentCount,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    firstPage.pagination.pages === Math.ceil(commentCount / pageSize),
  );
  // Verify comments belong to the correct post
  for (const comment of bestComments.data) {
    TestValidator.equals(
      "comment belongs to correct post",
      comment.post.id,
      post.id,
    );
  }
}
