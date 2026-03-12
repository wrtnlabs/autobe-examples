import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that community metrics accurately reflect a community with diverse activity including multiple posts, comments, and moderators.
 */
export async function test_api_community_metrics_with_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IRedditCloneAdmin.ILogin,
  });
  // 2. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Create a community as member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create multiple posts of different types (text, link, image)
  const posts: IRedditClonePost[] = [];
  // Create text post
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Text Post Title",
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(textPost);
  posts.push(textPost);
  // Create link post
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Link Post Title",
        postType: "link",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(linkPost);
  posts.push(linkPost);
  // Create image post
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Image Post Title",
        postType: "image",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(imagePost);
  posts.push(imagePost);
  // 5. Create multiple comments on those posts
  const comments: IRedditCloneComment[] = [];
  // Create comments on first post
  for (let i = 0; i < 3; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: {
            postId: textPost.id,
          },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Create comments on second post
  for (let i = 0; i < 2; i++) {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: {
            postId: linkPost.id,
          },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Create a comment on third post
  const comment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: imagePost.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment3);
  comments.push(comment3);
  // 6. Add additional moderators to the community
  // First, create another member to add as moderator
  const modMemberConnection: api.IConnection = { host: connection.host };
  const modMember = await authorize_member_join(modMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(modMember);
  // Add the new member as moderator (requires community owner to do this)
  const moderator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          memberId: modMember.id,
          role: "mod",
        },
      },
    );
  typia.assert(moderator);
  // 7. Retrieve community metrics as admin
  const metrics = await api.functional.redditClone.admin.communities.metrics(
    adminConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(metrics);
  // 8. Validate all metric fields against expected values
  // Validate community_id and community_name
  TestValidator.equals(
    "community_id matches",
    metrics.community_id,
    community.id,
  );
  TestValidator.equals(
    "community_name matches",
    metrics.community_name,
    community.name,
  );
  // Validate subscriber_count (should be at least 1 - the owner)
  TestValidator.predicate(
    "subscriber_count >= 1",
    metrics.subscriber_count >= 1,
  );
  // Validate created_at matches community creation time
  TestValidator.equals(
    "created_at matches",
    metrics.created_at,
    community.created_at,
  );
  // Validate total_posts (should be 3: text, link, image)
  TestValidator.equals("total_posts is 3", metrics.total_posts, 3);
  // Validate posts_by_type breakdown
  TestValidator.equals("text posts count", metrics.posts_by_type.text, 1);
  TestValidator.equals("link posts count", metrics.posts_by_type.link, 1);
  TestValidator.equals("image posts count", metrics.posts_by_type.image, 1);
  // Validate avg_post_score (all posts start with score 0)
  TestValidator.equals("avg_post_score is 0", metrics.avg_post_score, 0);
  // Validate most_recent_post_at (should be the latest post creation time)
  const latestPostTime = new Date(
    Math.max(
      new Date(textPost.created_at).getTime(),
      new Date(linkPost.created_at).getTime(),
      new Date(imagePost.created_at).getTime(),
    ),
  ).toISOString();
  TestValidator.equals(
    "most_recent_post_at is correct",
    metrics.most_recent_post_at,
    latestPostTime,
  );
  // Validate total_comments (should be 6: 3 + 2 + 1)
  TestValidator.equals("total_comments is 6", metrics.total_comments, 6);
  // Validate avg_comment_score (all comments start with score 0)
  TestValidator.equals("avg_comment_score is 0", metrics.avg_comment_score, 0);
  // Validate most_recent_comment_at (should be the latest comment creation time)
  const latestCommentTime = new Date(
    comments.reduce(
      (max, comment) =>
        new Date(comment.created_at).getTime() > new Date(max).getTime()
          ? comment.created_at
          : max,
      comments[0].created_at,
    ),
  ).toISOString();
  TestValidator.equals(
    "most_recent_comment_at is correct",
    metrics.most_recent_comment_at,
    latestCommentTime,
  );
  // Validate total_moderators (should be 2: owner + 1 mod)
  TestValidator.equals("total_moderators is 2", metrics.total_moderators, 2);
  // Validate moderators_by_role breakdown
  TestValidator.equals("owner count is 1", metrics.moderators_by_role.owner, 1);
  TestValidator.equals("mod count is 1", metrics.moderators_by_role.mod, 1);
  // Validate active_bans (should be 0)
  TestValidator.equals("active_bans is 0", metrics.active_bans, 0);
  // Validate total_engagement (posts + comments = 3 + 6 = 9)
  TestValidator.equals("total_engagement is 9", metrics.total_engagement, 9);
  // Validate activity_score exists (should not be null since there's activity)
  TestValidator.predicate(
    "activity_score is not null",
    metrics.activity_score !== null,
  );
}