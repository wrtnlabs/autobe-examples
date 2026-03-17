import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
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
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";

export async function test_api_comment_snapshot_reply_comment_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
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
  // Set authorization header for member connection
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Create a community
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
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: null,
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(topLevelComment);
  // 5. Create a reply comment to the top-level comment
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(replyComment);
  // Verify the reply comment has the correct parent reference
  TestValidator.equals(
    "reply comment parent_id matches top-level comment",
    replyComment.parent?.id,
    topLevelComment.id,
  );
  // Store original body for comparison
  const originalReplyBody = replyComment.body;
  // 6. Update the reply comment (this creates a snapshot)
  const updatedBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: replyComment.id,
        body: {
          body: updatedBody,
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Verify the comment was updated
  TestValidator.equals(
    "comment body was updated",
    updatedComment.body,
    updatedBody,
  );
  TestValidator.notEquals(
    "comment body differs from original",
    updatedComment.body,
    originalReplyBody,
  );
  // 7. Retrieve the snapshot of the reply comment
  // Note: In production, you would first call a snapshots list endpoint to get the snapshot ID.
  // For this test, we assume the snapshot ID is obtained from such a list operation.
  // The snapshot created by the update operation would be the most recent one.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.redditClone.member.posts.comments.snapshots.at(
      memberConnection,
      {
        postId: post.id,
        commentId: replyComment.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot structure and content
  TestValidator.equals(
    "snapshot body matches the comment body at snapshot time",
    snapshot.body,
    updatedBody,
  );
  TestValidator.equals(
    "snapshot member matches comment author",
    snapshot.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "snapshot post matches the post",
    snapshot.post.id,
    post.id,
  );
  // Critical validation: parentComment should be populated for reply comments
  // This validates that nested comment history preserves thread structure
  TestValidator.predicate(
    "snapshot parentComment exists for reply comment",
    snapshot.parentComment !== null,
  );
  if (snapshot.parentComment !== null) {
    TestValidator.equals(
      "snapshot parentComment id matches top-level comment",
      snapshot.parentComment.id,
      topLevelComment.id,
    );
    TestValidator.equals(
      "snapshot parentComment body matches top-level comment body",
      snapshot.parentComment.body,
      topLevelComment.body,
    );
    TestValidator.equals(
      "snapshot parentComment author matches member",
      snapshot.parentComment.author.id,
      memberAuth.id,
    );
    TestValidator.predicate(
      "snapshot parentComment has vote_score field",
      typeof snapshot.parentComment.vote_score === "number",
    );
    TestValidator.predicate(
      "snapshot parentComment has reply_count field",
      typeof snapshot.parentComment.reply_count === "number",
    );
    TestValidator.predicate(
      "snapshot parentComment has created_at timestamp",
      typeof snapshot.parentComment.created_at === "string",
    );
  }
}
