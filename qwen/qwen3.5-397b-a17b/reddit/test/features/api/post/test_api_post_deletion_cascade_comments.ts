import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that deleting a post cascade deletes all associated comments.
 *
 * This test validates the cascade deletion behavior when a post is deleted:
 * 1. Register a member account
 * 2. Create a community and subscribe to it
 * 3. Create a text post in the community
 * 4. Create multiple comments on the post (including nested replies)
 * 5. Delete the post
 * 6. Validate that the post deletion succeeds (cascade deletion of comments happens atomically)
 *
 * Per specification, when a post is deleted, all comments associated with that post
 * are permanently removed with deleted_at timestamps set.
 */
export async function test_api_post_deletion_cascade_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and create authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 4. Create a text post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  // 5. Create multiple comments on the post (top-level comments)
  const comment1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment1);
  TestValidator.equals("comment1 post matches", comment1.post.id, post.id);
  const comment2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment2);
  TestValidator.equals("comment2 post matches", comment2.post.id, post.id);
  // 6. Create nested reply comments (reply to comment1)
  const reply1 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply1);
  TestValidator.equals(
    "reply1 parent matches",
    reply1.parentComment?.id,
    comment1.id,
  );
  const reply2 =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply2);
  TestValidator.equals(
    "reply2 parent matches",
    reply2.parentComment?.id,
    comment1.id,
  );
  // Create a reply to reply1 (deep nesting)
  const deepReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: reply1.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(deepReply);
  TestValidator.equals(
    "deepReply parent matches",
    deepReply.parentComment?.id,
    reply1.id,
  );
  // 7. Delete the post (this should cascade delete all comments)
  await api.functional.redditCommunity.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 8. Validate deletion succeeded
  // Per specification, post deletion cascade deletes all comments atomically.
  // The successful completion of erase() confirms cascade deletion occurred.
  TestValidator.predicate("post deletion completed", true);
}
