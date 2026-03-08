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

export async function test_api_member_comment_history_with_multiple_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments on the post (at least 3)
  const comments = await ArrayUtil.asyncRepeat(3, async () => {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          params: {
            postId: post.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Retrieve the member's comment history
  const commentHistory =
    await api.functional.communityPlatform.members.comments.search(connection, {
      memberId: member.id,
    });
  typia.assert(commentHistory);
  // 7. Validate comment count matches
  TestValidator.equals(
    "comment count matches created",
    commentHistory.data.length,
    comments.length,
  );
  TestValidator.equals(
    "pagination records matches",
    commentHistory.pagination.records,
    comments.length,
  );
  // 8. Validate comments are sorted by createdAt descending
  for (let i = 0; i < commentHistory.data.length - 1; i++) {
    const current = commentHistory.data[i];
    const next = commentHistory.data[i + 1];
    TestValidator.predicate(
      "comments sorted by createdAt descending",
      new Date(current.createdAt) >= new Date(next.createdAt),
    );
  }
  // 9. Validate author information matches the member
  for (const comment of commentHistory.data) {
    TestValidator.equals(
      "author id matches member",
      comment.author.id,
      member.id,
    );
    TestValidator.equals(
      "author username matches",
      comment.author.username,
      member.username,
    );
  }
  // 10. Validate post information matches
  for (const comment of commentHistory.data) {
    TestValidator.equals("post id matches", comment.post.id, post.id);
    TestValidator.equals("post title matches", comment.post.title, post.title);
    TestValidator.equals(
      "post community id matches",
      comment.post.community.id,
      community.id,
    );
  }
  // 11. Validate all comments belong to the created post
  const allBelongToPost = commentHistory.data.every(
    (c) => c.post.id === post.id,
  );
  TestValidator.predicate("all comments belong to post", allBelongToPost);
}
