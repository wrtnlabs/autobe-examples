import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReportSnapshot";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_report_snapshot_history_resolved_report(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member1 to create community and post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Step 2: Create a community as member1
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    member1Connection,
    { communityId: community.id },
  );
  // Step 4: Create a text post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Authenticate as member2 (different member) to submit the report
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Step 6: Create a report for the post - this creates the first 'pending' snapshot
  const report = await generate_random_reddit_like_member_reports_create(
    member2Connection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        commentId: null,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals("initial report status", report.status, "pending");
  // Step 7: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderator);
  // Step 8: Approve the report - this creates the second 'approved' snapshot
  const approvedReport =
    await api.functional.redditLike.moderator.reports.approve(
      moderatorConnection,
      { reportId: report.id },
    );
  typia.assert(approvedReport);
  TestValidator.equals(
    "approved report status",
    approvedReport.status,
    "approved",
  );
  // Step 9: Retrieve snapshots with default sort (desc - reverse chronological)
  const snapshotsDesc =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          sortDirection: "desc",
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsDesc);
  // Validate we have exactly 2 snapshots
  TestValidator.equals("snapshot count", snapshotsDesc.data.length, 2);
  // In reverse chronological order (newest first): approved should be first, then pending
  TestValidator.equals(
    "first snapshot status (desc)",
    snapshotsDesc.data[0]!.status,
    "approved",
  );
  TestValidator.equals(
    "second snapshot status (desc)",
    snapshotsDesc.data[1]!.status,
    "pending",
  );
  // Step 10: Test ascending sort (chronological order)
  const snapshotsAsc =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 10,
          sortDirection: "asc",
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAsc);
  // In chronological order (oldest first): pending should be first, then approved
  TestValidator.equals("snapshot count (asc)", snapshotsAsc.data.length, 2);
  TestValidator.equals(
    "first snapshot status (asc)",
    snapshotsAsc.data[0]!.status,
    "pending",
  );
  TestValidator.equals(
    "second snapshot status (asc)",
    snapshotsAsc.data[1]!.status,
    "approved",
  );
  // Step 11: Test pagination with limit=1
  const snapshotsPaginated =
    await api.functional.redditLike.moderator.reports.snapshots.index(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          page: 1,
          limit: 1,
          sortDirection: "desc",
        } satisfies IRedditLikeReportSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPaginated);
  // With limit=1 and desc sort, should only get the most recent snapshot (approved)
  TestValidator.equals(
    "paginated snapshot count",
    snapshotsPaginated.data.length,
    1,
  );
  TestValidator.equals(
    "paginated first snapshot status",
    snapshotsPaginated.data[0]!.status,
    "approved",
  );
}
