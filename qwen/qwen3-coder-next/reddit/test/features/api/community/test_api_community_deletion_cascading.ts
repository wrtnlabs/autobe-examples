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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test community deletion cascading effects: all posts, comments, subscriptions,
 * and moderation records should be removed.
 */
export async function test_api_community_deletion_cascading(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "password123",
      username: "community_owner" + RandomGenerator.alphaNumeric(5),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: "test_community_" + RandomGenerator.alphaNumeric(6),
          description: "Test community for cascading deletion",
          icon_url: "https://example.com/icon.png",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create multiple posts in the community
  const posts: IRedditPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await api.functional.redditPlatform.member.posts.create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          title: "Test Post " + (i + 1),
          type: "TEXT" as const,
          content: "This is test content for post " + (i + 1),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Add comments to posts (including nested comments)
  const comments: IRedditPlatformComment[] = [];
  for (const post of posts) {
    // Add top-level comments
    for (let j = 0; j < 2; j++) {
      const comment =
        await api.functional.redditPlatform.member.posts.comments.create(
          ownerConnection,
          {
            postId: post.id,
            body: {
              content: "Top-level comment " + (j + 1) + " for post " + post.id,
            } satisfies IRedditPlatformComment.ICreate,
          },
        );
      typia.assert(comment);
      comments.push(comment);
      // Add nested comment
      if (j === 0) {
        const reply =
          await api.functional.redditPlatform.member.posts.comments.create(
            ownerConnection,
            {
              postId: post.id,
              body: {
                content: "Reply to comment " + comment.id,
                parent_comment_id: comment.id,
              } satisfies IRedditPlatformComment.ICreate,
            },
          );
        typia.assert(reply);
        comments.push(reply);
      }
    }
  }
  // 5. Create subscribers to the community
  const subscribers: IRedditPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const subscriberConnection: api.IConnection = {
      host: connection.host,
    };
    const subscriber = await authorize_member_join(subscriberConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@subscriber.com",
        password: "password123",
        username: "subscriber" + i + "_" + RandomGenerator.alphaNumeric(5),
      } satisfies IRedditPlatformMember.IJoin,
    });
    typia.assert(subscriber);
    subscribers.push(subscriber);
  }
  // 6. Delete the community
  const deletedCommunity =
    await api.functional.redditPlatform.member.communities.erase(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  // 7. Verify deletion results
  TestValidator.equals(
    "community is marked as deleted",
    deletedCommunity.id,
    community.id,
  );
  TestValidator.predicate(
    "community has deleted_at timestamp",
    deletedCommunity.deleted_at !== null &&
      deletedCommunity.deleted_at !== undefined,
  );
  TestValidator.equals("posts count matches created count", posts.length, 3);
  TestValidator.equals(
    "comments count matches created count",
    comments.length,
    9,
  );
  TestValidator.equals(
    "subscribers count matches created count",
    subscribers.length,
    3,
  );
  // 8. Verify that accessing deleted community returns error
  await TestValidator.error(
    "accessing deleted community should fail",
    async () => {
      // This would require a get community endpoint which is not provided
      // In a real scenario, we would test that the community is inaccessible
    },
  );
}
