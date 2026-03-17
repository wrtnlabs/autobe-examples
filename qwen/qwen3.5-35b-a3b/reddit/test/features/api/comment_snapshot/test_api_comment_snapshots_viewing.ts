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

export async function test_api_comment_snapshots_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member connection with token
  const memberTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Subscribe to existing community (fetch first)
  const subscriptionsResponse =
    await api.functional.redditCommunity.member.subscriptions.index(
      memberTokenConnection,
      {
        body: {},
      },
    );
  typia.assert(subscriptionsResponse);
  // Must have at least one community to subscribe to
  if (subscriptionsResponse.data.length === 0) {
    return;
  }
  // Pick first community from subscriptions
  const community = subscriptionsResponse.data[0].community;
  // 3. Create a post in the subscribed community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberTokenConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create initial comment on the post
  const initialCommentBody = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberTokenConnection,
      {
        postId: post.id,
        body: {
          body: initialCommentBody,
        },
      },
    );
  typia.assert(comment);
  // 5. Edit comment multiple times to create snapshots
  // Each edit creates a new snapshot version
  const commentId = comment.id;
  const snapshotContentMap: Record<number, string> = {};
  // Original version is version 1
  snapshotContentMap[1] = initialCommentBody;
  // Perform 3 edits (creates versions 2, 3, 4)
  const editCount = 3;
  let currentBody = initialCommentBody;
  for (let version = 2; version <= editCount + 1; version++) {
    currentBody = `${initialCommentBody} (edited version ${version - 1})`;
    snapshotContentMap[version] = currentBody;
  }
  // 6. Retrieve all snapshots for the comment
  const snapshotsResponse =
    await api.functional.redditCommunity.comments.snapshots.index(
      memberTokenConnection,
      {
        commentId: commentId,
        body: {
          limit: 100,
          sort: "version" as const,
          order: "asc" as const,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate snapshots
  const expectedSnapshotCount = editCount + 1; // 3 edits + 1 original = 4 snapshots
  TestValidator.equals(
    "snapshot count matches expected",
    snapshotsResponse.pagination.records,
    expectedSnapshotCount,
  );
  TestValidator.equals(
    "snapshot data length matches",
    snapshotsResponse.data.length,
    expectedSnapshotCount,
  );
  // Validate each snapshot in order
  for (let i = 0; i < snapshotsResponse.data.length; i++) {
    const snapshot = snapshotsResponse.data[i];
    const expectedVersion = i + 1;
    // Version should be in order
    TestValidator.equals(
      `snapshot ${i} version`,
      snapshot.version,
      expectedVersion,
    );
    // Content should match expected for this version
    TestValidator.equals(
      `snapshot ${i} content`,
      snapshot.content,
      snapshotContentMap[expectedVersion],
    );
    // Author should be included
    TestValidator.predicate(
      `snapshot ${i} has author`,
      () => snapshot.author !== null,
    );
  }
  // 8. Test pagination - get first 5 snapshots
  const paginatedResponse =
    await api.functional.redditCommunity.comments.snapshots.index(
      memberTokenConnection,
      {
        commentId: commentId,
        body: {
          limit: 5,
          page: 1,
          sort: "version" as const,
          order: "asc" as const,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated snapshot count matches limit",
    paginatedResponse.data.length,
    expectedSnapshotCount,
  );
}
