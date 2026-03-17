import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentSnapshot";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
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

export async function test_api_comment_snapshots_deletion_cascade(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Step 2: Subscribe to an existing community
  const subscriptions =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberConnection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(subscriptions);
  // Must have at least one community to subscribe to
  TestValidator.predicate(
    "at least one community exists for subscription",
    subscriptions.data.length > 0,
  );
  const community = subscriptions.data[0].community;
  // Step 3: Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(5),
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Create initial comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "Initial comment text",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  const commentId = comment.id;
  // Step 5: Edit the comment multiple times to create snapshot versions
  const version1 =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: commentId,
        body: {
          body: "Edited comment version 1",
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(version1);
  const version2 =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: commentId,
        body: {
          body: "Edited comment version 2",
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(version2);
  const version3 =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: commentId,
        body: {
          body: "Edited comment version 3",
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(version3);
  // Verify initial comment had original content
  TestValidator.equals(
    "initial comment body",
    comment.body,
    "Initial comment text",
  );
  TestValidator.equals(
    "version1 comment body",
    version1.body,
    "Edited comment version 1",
  );
  TestValidator.equals(
    "version2 comment body",
    version2.body,
    "Edited comment version 2",
  );
  TestValidator.equals(
    "version3 comment body",
    version3.body,
    "Edited comment version 3",
  );
  // Step 6: Delete the comment while preserving snapshot history
  await api.functional.redditCommunity.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: commentId,
    },
  );
  // Step 7: Verify that snapshots are still accessible after comment deletion
  const snapshots =
    await api.functional.redditCommunity.comments.snapshots.index(
      memberConnection,
      {
        commentId: commentId,
        body: {
          limit: 100,
        } satisfies IRedditCommunityCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Verify that we have exactly 4 snapshots (original + 3 edits)
  TestValidator.equals("snapshot count", snapshots.data.length, 4);
  // Verify each snapshot version has correct content
  TestValidator.equals(
    "version 1 content",
    snapshots.data[0].content,
    "Initial comment text",
  );
  TestValidator.equals(
    "version 2 content",
    snapshots.data[1].content,
    "Edited comment version 1",
  );
  TestValidator.equals(
    "version 3 content",
    snapshots.data[2].content,
    "Edited comment version 2",
  );
  TestValidator.equals(
    "version 4 content",
    snapshots.data[3].content,
    "Edited comment version 3",
  );
  // Verify versions are sequential
  TestValidator.equals("version 1 sequence", snapshots.data[0].version, 1);
  TestValidator.equals("version 2 sequence", snapshots.data[1].version, 2);
  TestValidator.equals("version 3 sequence", snapshots.data[2].version, 3);
  TestValidator.equals("version 4 sequence", snapshots.data[3].version, 4);
  // Verify all snapshots were authored by the same member by checking author IDs match
  const firstAuthorId = snapshots.data[0].author.id;
  const allSnapshotsSameAuthor = snapshots.data.every(
    (s) => s.author.id === firstAuthorId,
  );
  TestValidator.predicate("all snapshots same author", allSnapshotsSameAuthor);
}
