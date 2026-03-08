import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the complete comment edit history snapshot lifecycle.
 *
 * Verifies that:
 * 1. Each comment edit creates a snapshot preserving the previous content
 * 2. Snapshots are ordered by created_at descending (most recent first)
 * 3. Snapshots contain the content state BEFORE each edit was applied
 * 4. Pagination metadata is correct
 */
export async function test_api_comment_snapshot_edit_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to own community for posting privileges
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Create initial comment
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: originalContent },
      },
    );
  typia.assert(comment);
  // 6. Edit comment 3 times with different content
  const editContents = [
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 4 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];
  // Track content history: [original, after_edit1, after_edit2, after_edit3]
  const contentHistory = [originalContent];
  for (const editContent of editContents) {
    const updatedComment =
      await api.functional.communityPlatform.member.posts.comments.update(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: editContent,
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
    contentHistory.push(editContent);
  }
  // 7. Retrieve snapshot history
  const snapshotPage =
    await api.functional.communityPlatform.comments.snapshots.index(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 8. Verify 3 snapshots were created (one per edit)
  TestValidator.equals("snapshot count", snapshotPage.data.length, 3);
  // 9. Verify pagination metadata
  TestValidator.equals("current page", snapshotPage.pagination.current, 1);
  TestValidator.predicate("has records", snapshotPage.pagination.records >= 3);
  TestValidator.predicate("has pages", snapshotPage.pagination.pages >= 1);
  // 10. Verify snapshots are ordered by created_at descending (most recent first)
  for (let i = 0; i < snapshotPage.data.length - 1; i++) {
    const current = new Date(snapshotPage.data[i].created_at);
    const next = new Date(snapshotPage.data[i + 1].created_at);
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      current >= next,
    );
  }
  // 11. Verify snapshot contents match expected history
  // Snapshots capture content BEFORE each edit:
  // - Snapshot 1 (oldest): content before edit1 = original content
  // - Snapshot 2: content before edit2 = edit1 result
  // - Snapshot 3 (newest): content before edit3 = edit2 result
  const expectedContents = [
    contentHistory[0], // original content (before edit1)
    contentHistory[1], // after edit1 (before edit2)
    contentHistory[2], // after edit2 (before edit3)
  ];
  // Data is ordered descending, so reverse for comparison
  const actualContents = [...snapshotPage.data].reverse().map((s) => s.content);
  TestValidator.equals(
    "snapshot contents match expected history",
    actualContents,
    expectedContents,
  );
  // 12. Verify each snapshot has required fields
  for (const snapshot of snapshotPage.data) {
    TestValidator.predicate("has uuid id", snapshot.id.length === 36);
    TestValidator.predicate("has content", snapshot.content.length > 0);
    TestValidator.predicate("has created_at", snapshot.created_at.length > 0);
  }
}
