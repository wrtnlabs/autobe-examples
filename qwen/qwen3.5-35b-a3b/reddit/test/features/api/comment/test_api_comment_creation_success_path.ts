import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_creation_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Extract member ID for later validation
  const memberId = memberAuth.id;
  // 2. Create community using the authenticated member
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<100> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
        },
      },
    );
  typia.assert(community);
  const communityId = community.id;
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        params: { communityId },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        postType: "TEXT",
        redditPlatformCommunityId: communityId,
        content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  // 5. Create comment on post
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberConnection,
    {
      body: {
        post_id: postId,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  typia.assert(comment);
  // 6. Validate comment response
  TestValidator.equals(
    "comment author_id matches member id",
    comment.author_id,
    memberId,
  );
  TestValidator.equals(
    "comment post_id matches post id",
    comment.post_id,
    postId,
  );
  TestValidator.equals("comment vote_score is 0", comment.vote_score, 0);
  TestValidator.predicate(
    "comment content is non-empty",
    comment.content.length > 0,
  );
  typia.assert(comment.author);
  TestValidator.equals(
    "comment author username matches",
    comment.author.username,
    memberAuth.username,
  );
  const commentPost = typia.assert<IRedditPlatformPost>(comment.post);
  TestValidator.equals(
    "comment post title matches",
    commentPost.title,
    post.title,
  );
  // 7. Validate timestamps are valid ISO 8601
  TestValidator.predicate(
    "comment created_at is valid date",
    () => !isNaN(new Date(comment.created_at).getTime()),
  );
  TestValidator.predicate(
    "comment updated_at is valid date",
    () => !isNaN(new Date(comment.updated_at).getTime()),
  );
  // 8. Validate parent_id is null for top-level comment
  TestValidator.equals(
    "top-level comment has null parent_id",
    comment.parent_id,
    null,
  );
  // 9. Validate parent is null for top-level comment
  typia.assertGuard(comment.parent);
  if (comment.parent !== null) {
    throw new Error("Top-level comment should have null parent");
  }
}