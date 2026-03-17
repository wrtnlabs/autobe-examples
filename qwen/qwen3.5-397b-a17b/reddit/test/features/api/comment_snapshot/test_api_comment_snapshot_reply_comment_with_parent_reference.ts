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

export async function test_api_comment_snapshot_reply_comment_with_parent_reference(
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
  // 2. Community creation
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Community subscription
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
  // 4. Post creation
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Parent comment creation (top-level comment)
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment has no parent",
    parentComment.parent,
    null,
  );
  // 6. Reply comment creation (with parent reference)
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.notEquals(
    "reply comment has parent",
    replyComment.parent,
    null,
  );
  if (replyComment.parent !== null) {
    TestValidator.equals(
      "reply parent matches original parent",
      replyComment.parent.id,
      parentComment.id,
    );
  }
  // 7. Retrieve reply comment's snapshot history
  const snapshotResponse =
    await api.functional.redditClone.member.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: replyComment.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCloneCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshotResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    snapshotResponse.pagination.pages >= 0,
  );
  // 9. Validate snapshot data structure and parent reference preservation
  if (snapshotResponse.data.length > 0) {
    for (const snapshot of snapshotResponse.data) {
      // Validate post reference matches original post
      TestValidator.equals(
        "snapshot post matches original post",
        snapshot.post.id,
        post.id,
      );
      // Validate member (author) reference exists
      TestValidator.predicate(
        "snapshot member id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.member.id,
        ),
      );
      // CRITICAL: Validate parentComment field is preserved in snapshot
      // For reply comments, parentComment should reference the original parent
      if (snapshot.parentComment !== null) {
        TestValidator.equals(
          "snapshot parentComment matches original parent",
          snapshot.parentComment.id,
          parentComment.id,
        );
      }
      // Validate snapshot timestamp is valid ISO date-time
      TestValidator.predicate(
        "snapshot created_at is valid ISO date-time",
        !isNaN(Date.parse(snapshot.created_at)),
      );
      // Validate snapshot body is non-empty string
      TestValidator.predicate(
        "snapshot body is non-empty",
        snapshot.body.length > 0,
      );
    }
  }
}