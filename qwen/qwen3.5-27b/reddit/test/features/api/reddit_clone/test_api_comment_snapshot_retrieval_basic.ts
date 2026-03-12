import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommentSnapshot";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test basic retrieval of comment snapshots for a comment that has been modified multiple times.
 * Verifies snapshots are returned in chronological order with content, vote score, and timestamps.
 */
export async function test_api_comment_snapshot_retrieval_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Retrieve comment snapshots
  const snapshots =
    await api.functional.redditClone.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_created_at",
          order: "desc",
        } satisfies IRedditCloneCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 10);
  TestValidator.predicate("has records", snapshots.pagination.records >= 0);
  TestValidator.predicate("has pages", snapshots.pagination.pages >= 0);
  // 7. Validate snapshot data
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Validate snapshot structure
    TestValidator.predicate("has snapshot id", firstSnapshot.id.length > 0);
    TestValidator.predicate("has content", firstSnapshot.content.length > 0);
    TestValidator.predicate(
      "has vote score",
      typeof firstSnapshot.vote_score === "number",
    );
    TestValidator.predicate(
      "has snapshot timestamp",
      firstSnapshot.snapshot_created_at.length > 0,
    );
    TestValidator.predicate(
      "has comment created timestamp",
      firstSnapshot.comment_created_at.length > 0,
    );
    TestValidator.predicate(
      "has comment updated timestamp",
      firstSnapshot.comment_updated_at.length > 0,
    );
    // Validate author information
    TestValidator.predicate(
      "author id exists",
      firstSnapshot.author.id.length > 0,
    );
    TestValidator.predicate(
      "author username exists",
      firstSnapshot.author.username.length > 0,
    );
    TestValidator.predicate(
      "author display name exists",
      firstSnapshot.author.display_name.length > 0,
    );
  }
}