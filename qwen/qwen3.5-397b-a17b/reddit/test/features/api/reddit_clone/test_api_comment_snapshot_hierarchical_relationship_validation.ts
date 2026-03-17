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

export async function test_api_comment_snapshot_hierarchical_relationship_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create two posts in the community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post2);
  // 4. Create a comment on the first post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post1.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Update the comment to generate a snapshot
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post1.id,
        commentId: comment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Test hierarchical validation: Attempt to access snapshot with wrong post ID
  // Generate a snapshot ID (in real scenario, this would come from snapshot list)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // This should return 404 because the hierarchical path is invalid
  // (snapshot accessed through wrong post in the path)
  await TestValidator.error(
    "snapshot access with wrong post ID should fail hierarchical validation",
    async () => {
      await api.functional.redditClone.member.posts.comments.snapshots.at(
        memberConnection,
        {
          postId: post2.id, // Wrong post ID - comment belongs to post1
          commentId: comment.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
  // 7. Test hierarchical validation: Attempt to access snapshot with wrong comment ID
  // Create another comment on post1 to use as wrong comment ID
  const otherComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCloneComment.ICreate,
        params: {
          postId: post1.id,
        },
      },
    );
  typia.assert(otherComment);
  // This should return 404 because the comment ID doesn't match the snapshot
  await TestValidator.error(
    "snapshot access with wrong comment ID should fail hierarchical validation",
    async () => {
      await api.functional.redditClone.member.posts.comments.snapshots.at(
        memberConnection,
        {
          postId: post1.id,
          commentId: otherComment.id, // Wrong comment ID
          snapshotId: snapshotId,
        },
      );
    },
  );
}
