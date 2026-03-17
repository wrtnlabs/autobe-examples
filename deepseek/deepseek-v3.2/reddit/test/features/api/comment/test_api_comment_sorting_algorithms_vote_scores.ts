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

export async function test_api_comment_sorting_algorithms_vote_scores(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to community
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
  // Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
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
  // Create comments
  const comments: ICommunityPlatformComment[] = [];
  // Create 5 comments
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            parentCommentId: null,
          } satisfies ICommunityPlatformComment.ICreate,
          params: { postId: post.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
    // Add small delay to ensure different created_at timestamps
    if (i < 4) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  // Test sorting by 'best' (highest vote score first)
  const bestResponse =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 10,
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestResponse);
  // Test sorting by 'new' (most recent first)
  const newResponse =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newResponse);
  // Test sorting by 'controversial' (vote score closest to zero first)
  const controversialResponse =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Verify we got the expected number of comments
  TestValidator.equals(
    "best sorting returns all comments",
    bestResponse.data.length,
    comments.length,
  );
  TestValidator.equals(
    "new sorting returns all comments",
    newResponse.data.length,
    comments.length,
  );
  TestValidator.equals(
    "controversial sorting returns all comments",
    controversialResponse.data.length,
    comments.length,
  );
  // Validate 'new' sorting: most recent first (created_at descending)
  for (let i = 0; i < newResponse.data.length - 1; i++) {
    const currentDate = new Date(newResponse.data[i].createdAt);
    const nextDate = new Date(newResponse.data[i + 1].createdAt);
    TestValidator.predicate(
      `new sorting order index ${i} > ${i + 1}`,
      currentDate >= nextDate,
    );
  }
  // Note: Without ability to set vote scores, we cannot fully test 'best' and 'controversial' sorting
  // This test verifies the API endpoints work and that 'new' sorting functions correctly
}
