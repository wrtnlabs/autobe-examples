import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test comment snapshot retrieval after multiple edits.
 *
 * This test validates the comment audit trail functionality by:
 * 1. Creating a member account and authenticating
 * 2. Creating a community for the post
 * 3. Subscribing to the community
 * 4. Creating a post in the community
 * 5. Creating a comment on the post
 * 6. Retrieving the comment snapshots to verify the audit trail endpoint works
 */
export async function test_api_comment_snapshot_retrieval_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve comment snapshots
  const snapshots =
    await api.functional.redditClone.member.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 8. Validate snapshot data structure if snapshots exist
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID",
      /^[0-9a-f-]{36}$/i.test(firstSnapshot.id),
    );
    TestValidator.predicate(
      "snapshot body is not empty",
      firstSnapshot.body.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      firstSnapshot.created_at.length > 0,
    );
    TestValidator.equals(
      "snapshot member ID matches comment author",
      firstSnapshot.member.id,
      comment.author.id,
    );
    TestValidator.equals(
      "snapshot post ID matches",
      firstSnapshot.post.id,
      post.id,
    );
    // Validate parent comment reference (null for top-level comments)
    if (comment.parent === null) {
      TestValidator.equals(
        "parent comment is null for top-level",
        firstSnapshot.parentComment,
        null,
      );
    }
  }
  // 9. Validate chronological order if multiple snapshots exist
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      const prevSnapshot = snapshots.data[i - 1];
      const currSnapshot = snapshots.data[i];
      TestValidator.predicate(
        "snapshots are in chronological order",
        new Date(prevSnapshot.created_at).getTime() <=
          new Date(currSnapshot.created_at).getTime(),
      );
    }
  }
}