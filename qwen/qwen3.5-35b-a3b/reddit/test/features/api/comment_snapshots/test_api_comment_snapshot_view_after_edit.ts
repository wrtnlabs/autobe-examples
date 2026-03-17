import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_snapshot_view_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Member creates a community post
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const postTitle = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<300>
  >();
  const postBody = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<5000>
  >();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text" as const,
        body: postBody,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member creates original comment (version 1)
  const originalCommentBody = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: originalCommentBody,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Member edits comment (creates version 2 snapshot)
  const editedCommentBody = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();
  const editedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: editedCommentBody,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(editedComment);
  // 5. Guest user retrieves snapshot version
  const guestConnection: api.IConnection = { host: connection.host };
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.redditCommunity.comments.snapshots.at(
    guestConnection,
    {
      commentId: comment.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot structure
  TestValidator.equals("snapshot has valid id", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot contains edited content",
    snapshot.content,
    editedCommentBody,
  );
  TestValidator.equals("snapshot version is 2", snapshot.version, 2);
  TestValidator.equals(
    "snapshot author username matches",
    snapshot.author.username,
    editedComment.author.username,
  );
  TestValidator.equals(
    "snapshot post title matches",
    snapshot.post.title,
    post.title,
  );
  TestValidator.equals(
    "snapshot comment_id matches",
    snapshot.comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.created_at !== undefined,
  );
}
