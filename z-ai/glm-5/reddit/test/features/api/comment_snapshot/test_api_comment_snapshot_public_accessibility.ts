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

export async function test_api_comment_snapshot_public_accessibility(
  connection: api.IConnection,
): Promise<void> {
  // ==========================================
  // Prerequisites: Member A creates content
  // ==========================================
  // 1. Member A authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to their community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        title: "Test Post for Snapshot Visibility",
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Original comment content for snapshot test",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Member A edits the comment multiple times to create snapshot history
  const editContents = [
    "First edit - updated content",
    "Second edit - further modifications",
    "Third edit - final version",
  ];
  for (const content of editContents) {
    const updatedComment =
      await api.functional.communityPlatform.member.posts.comments.update(
        memberAConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: { content } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
  }
  // ==========================================
  // Main Test: Member B accesses snapshots
  // ==========================================
  // 7. Member B authenticates as a different member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 8. Member B retrieves the snapshot history (should be public)
  const snapshotsByMemberB =
    await api.functional.communityPlatform.comments.snapshots.index(
      memberBConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByMemberB);
  // 9. Verify Member B can see the snapshots
  TestValidator.predicate(
    "Member B can access snapshots",
    snapshotsByMemberB.data.length > 0,
  );
  // 10. Verify all snapshots are visible (3 edits = 3 snapshots)
  TestValidator.equals(
    "Snapshot count matches edit count",
    snapshotsByMemberB.pagination.records,
    editContents.length,
  );
  // 11. Verify snapshot content includes all previous versions
  const snapshotContents = snapshotsByMemberB.data.map((s) => s.content);
  TestValidator.predicate(
    "Original content is preserved in snapshots",
    snapshotContents.includes("Original comment content for snapshot test"),
  );
  TestValidator.predicate(
    "First edit is preserved in snapshots",
    snapshotContents.includes("First edit - updated content"),
  );
  TestValidator.predicate(
    "Second edit is preserved in snapshots",
    snapshotContents.includes("Second edit - further modifications"),
  );
  // ==========================================
  // Guest Access Test (unauthenticated)
  // ==========================================
  // 12. Create a guest connection (no authentication)
  const guestConnection: api.IConnection = { host: connection.host };
  // 13. Guest retrieves the snapshot history
  const snapshotsByGuest =
    await api.functional.communityPlatform.comments.snapshots.index(
      guestConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByGuest);
  // 14. Verify guest can see the same snapshots
  TestValidator.equals(
    "Guest can access same number of snapshots",
    snapshotsByGuest.pagination.records,
    editContents.length,
  );
  // 15. Verify guest sees identical content as Member B
  TestValidator.equals(
    "Guest sees identical snapshot count",
    snapshotsByGuest.data.length,
    snapshotsByMemberB.data.length,
  );
  // ==========================================
  // Pagination Test
  // ==========================================
  // 16. Test pagination works correctly for non-author
  const firstPage =
    await api.functional.communityPlatform.comments.snapshots.index(
      memberBConnection,
      {
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "First page has correct item count",
    firstPage.data.length,
    2,
  );
  TestValidator.equals(
    "Pagination shows correct current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination shows correct limit",
    firstPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "Pagination shows total pages correctly",
    firstPage.pagination.pages >= 2,
  );
  // 17. Verify ordering (most recent first)
  if (firstPage.data.length >= 2) {
    const firstDate = new Date(firstPage.data[0].created_at).getTime();
    const secondDate = new Date(firstPage.data[1].created_at).getTime();
    TestValidator.predicate(
      "Snapshots are ordered by created_at descending",
      firstDate >= secondDate,
    );
  }
}
