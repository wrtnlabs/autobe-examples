import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that the post-snapshots endpoint returns a paginated list of historical
 * post snapshots without requiring authentication.
 *
 * Workflow:
 * 1. Create a member account and authenticate
 * 2. Create a community
 * 3. Create a text post in the community
 * 4. Edit the post to trigger an 'edit' snapshot creation
 * 5. Delete the post to trigger a 'deletion' snapshot creation
 * 6. Call the post-snapshots endpoint without authentication
 * 7. Validate pagination metadata and snapshot content
 */
export async function test_api_post_snapshot_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  typia.assert(post);
  // 4. Edit the post to trigger an 'edit' snapshot
  const editedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: `${post.title} (edited)`,
        text_content: `${post.textContent ?? ""} - Updated content.`,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(editedPost);
  // 5. Delete the post to trigger a 'deletion' snapshot
  await api.functional.community.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 6. Call post-snapshots endpoint WITHOUT authentication
  const unauthConnection: api.IConnection = { host: connection.host };
  const snapshots = await api.functional.community.post_snapshots.index(
    unauthConnection,
    {
      body: {
        community_post_id: post.id,
        sort_by: "created_at",
        sort_direction: "desc",
        page: 1,
        limit: 20,
      } satisfies ICommunityPostSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination has required fields",
    () =>
      snapshots.pagination.current !== undefined &&
      snapshots.pagination.limit !== undefined &&
      snapshots.pagination.records !== undefined &&
      snapshots.pagination.pages !== undefined,
  );
  TestValidator.predicate(
    "pagination values are valid",
    () =>
      snapshots.pagination.current >= 1 &&
      snapshots.pagination.limit >= 1 &&
      snapshots.pagination.records >= 0 &&
      snapshots.pagination.pages >= 0,
  );
  // 8. Validate snapshot data for our post exists
  TestValidator.predicate(
    "snapshots contain entries for the deleted post",
    () => snapshots.data.length >= 2,
  );
  // 9. Validate each snapshot has required fields
  for (const snapshot of snapshots.data) {
    TestValidator.predicate(
      "snapshot has id",
      () => typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has community_post_id",
      () =>
        typeof snapshot.community_post_id === "string" &&
        snapshot.community_post_id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has title",
      () => typeof snapshot.title === "string" && snapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot has post_type",
      () =>
        snapshot.post_type === "TEXT" ||
        snapshot.post_type === "LINK" ||
        snapshot.post_type === "IMAGE",
    );
    TestValidator.predicate(
      "snapshot has author",
      () => snapshot.author !== null && snapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has community",
      () => snapshot.community !== null && snapshot.community !== undefined,
    );
    TestValidator.predicate(
      "snapshot has vote_score",
      () => typeof snapshot.vote_score === "number",
    );
    TestValidator.predicate(
      "snapshot has upvote_count",
      () => typeof snapshot.upvote_count === "number",
    );
    TestValidator.predicate(
      "snapshot has downvote_count",
      () => typeof snapshot.downvote_count === "number",
    );
    TestValidator.predicate(
      "snapshot has comment_count",
      () => typeof snapshot.comment_count === "number",
    );
    TestValidator.predicate(
      "snapshot has hot_score",
      () => typeof snapshot.hot_score === "number",
    );
    TestValidator.predicate(
      "snapshot has controversy_score",
      () => typeof snapshot.controversy_score === "number",
    );
    TestValidator.predicate(
      "snapshot has snapshot_reason",
      () =>
        snapshot.snapshot_reason === "edit" ||
        snapshot.snapshot_reason === "deletion" ||
        snapshot.snapshot_reason === "moderation" ||
        snapshot.snapshot_reason === "scheduled",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      () => typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has original_created_at",
      () => typeof snapshot.original_created_at === "string",
    );
  }
  // 10. Validate snapshots are sorted by created_at descending
  for (let i = 1; i < snapshots.data.length; i++) {
    const prev = new Date(snapshots.data[i - 1].created_at);
    const curr = new Date(snapshots.data[i].created_at);
    TestValidator.predicate(
      "snapshots are sorted by created_at descending",
      () => prev >= curr,
    );
  }
  // 11. Validate edit and deletion snapshots exist for our post
  const postSnapshots = snapshots.data.filter(
    (s) => s.community_post_id === post.id,
  );
  TestValidator.predicate(
    "post has both edit and deletion snapshots",
    () => postSnapshots.length >= 2,
  );
  const hasEditSnapshot = postSnapshots.some(
    (s) => s.snapshot_reason === "edit",
  );
  const hasDeletionSnapshot = postSnapshots.some(
    (s) => s.snapshot_reason === "deletion",
  );
  TestValidator.predicate("has edit snapshot", () => hasEditSnapshot);
  TestValidator.predicate("has deletion snapshot", () => hasDeletionSnapshot);
}
