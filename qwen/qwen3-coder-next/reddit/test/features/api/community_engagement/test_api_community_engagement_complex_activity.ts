import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
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
import { generate_random_reddit_platform_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_member_posts_votes_create_vote";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_community_engagement_complex_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community with existing activity
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create multiple posts with varying engagement levels
  const posts: IRedditPlatformPost[] = [];
  // High engagement post
  const highEngagementPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(3),
        type: "TEXT",
        content: RandomGenerator.content({ paragraphs: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(highEngagementPost);
  posts.push(highEngagementPost);
  // Medium engagement post
  const mediumEngagementPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(2),
        type: "LINK",
        url: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(mediumEngagementPost);
  posts.push(mediumEngagementPost);
  // Low engagement post
  const lowEngagementPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(1),
        type: "IMAGE",
        imageUrl: `https://example.com/image.png`,
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(lowEngagementPost);
  posts.push(lowEngagementPost);
  // 4. Create comments on posts with nested threading
  const comments: IRedditPlatformComment[] = [];
  // Add comments to high engagement post
  for (let i = 0; i < 5; i++) {
    const comment =
      await api.functional.redditPlatform.member.posts.comments.create(
        memberConnection,
        {
          postId: highEngagementPost.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IRedditPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Add nested replies
  for (let i = 0; i < 3; i++) {
    const reply =
      await api.functional.redditPlatform.member.posts.comments.create(
        memberConnection,
        {
          postId: highEngagementPost.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            parent_comment_id: comments[i].id,
          } satisfies IRedditPlatformComment.ICreate,
        },
      );
    typia.assert(reply);
    comments.push(reply);
  }
  // 5. Generate votes on posts
  // Add upvotes to high engagement post
  for (let i = 0; i < 10; i++) {
    const vote =
      await api.functional.redditPlatform.member.posts.votes.createVote(
        memberConnection,
        {
          postId: highEngagementPost.id,
          body: {
            vote_type: "UPVOTE",
          } satisfies IRedditPlatformPostVote.ICreate,
        },
      );
    typia.assert(vote);
  }
  // Add downvotes to low engagement post
  for (let i = 0; i < 5; i++) {
    const vote =
      await api.functional.redditPlatform.member.posts.votes.createVote(
        memberConnection,
        {
          postId: lowEngagementPost.id,
          body: {
            vote_type: "DOWNVOTE",
          } satisfies IRedditPlatformPostVote.ICreate,
        },
      );
    typia.assert(vote);
  }
  // 6. Verify engagement metrics
  const engagement =
    await api.functional.redditPlatform.member.communities.engagement(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(engagement);
  // Validate engagement data structure
  TestValidator.equals(
    "engagement has valid structure",
    engagement.id !== null,
    true,
  );
  TestValidator.predicate(
    "engagement has valid session ID",
    engagement.sessionId.length > 0,
  );
  TestValidator.equals(
    "engagement has community context",
    engagement.communityId,
    community.id,
  );
  TestValidator.equals(
    "engagement feed type",
    engagement.feedType,
    "community",
  );
}
