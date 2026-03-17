import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Create a community (moderator becomes owner with report viewing privileges)
  const community =
    await generate_random_community_platform_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      moderatorConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Create reporter members and submit reports
  const reporter1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter1Connection, {});
  const reporter2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporter2Connection, {});
  // Report 1: Post report with unique reason
  const postReport =
    await generate_random_community_platform_member_reports_create(
      reporter1Connection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
          target_id: post.id,
          reason: "This is spam content that violates community guidelines",
        },
      },
    );
  typia.assert(postReport);
  // Report 2: Comment report with unique reason
  const commentReport =
    await generate_random_community_platform_member_reports_create(
      reporter2Connection,
      {
        body: {
          community_id: community.id,
          target_type: "comment",
          target_id: comment.id,
          reason: "Harassment and personal attacks detected here",
        },
      },
    );
  typia.assert(commentReport);
  // 6. Test: Filter by status='pending'
  const pendingReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          status: "pending",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  TestValidator.predicate(
    "pending reports returned",
    pendingReports.data.length >= 2,
  );
  TestValidator.predicate(
    "all reports are pending",
    pendingReports.data.every((r) => r.status === "pending"),
  );
  // 7. Test: Filter by target_type='post'
  const postReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(postReports);
  TestValidator.predicate(
    "post reports contain target_type post",
    postReports.data.every((r) => r.target_type === "post"),
  );
  TestValidator.predicate(
    "post report is included",
    postReports.data.some((r) => r.id === postReport.id),
  );
  // 8. Test: Filter by target_type='comment'
  const commentReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          target_type: "comment",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.predicate(
    "comment reports contain target_type comment",
    commentReports.data.every((r) => r.target_type === "comment"),
  );
  TestValidator.predicate(
    "comment report is included",
    commentReports.data.some((r) => r.id === commentReport.id),
  );
  // 9. Test: Search filter by reason text
  const spamReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          search: "spam",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(spamReports);
  TestValidator.predicate(
    "spam search finds post report",
    spamReports.data.some((r) => r.id === postReport.id),
  );
  const harassmentReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          search: "Harassment",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(harassmentReports);
  TestValidator.predicate(
    "harassment search finds comment report",
    harassmentReports.data.some((r) => r.id === commentReport.id),
  );
  // 10. Test: Combined filters - status and target_type
  const pendingPostReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          status: "pending",
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(pendingPostReports);
  TestValidator.predicate(
    "pending post reports are all pending and post type",
    pendingPostReports.data.every(
      (r) => r.status === "pending" && r.target_type === "post",
    ),
  );
  // 11. Test: Default behavior (no status filter)
  const allPendingReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(allPendingReports);
  TestValidator.predicate(
    "default shows pending reports",
    allPendingReports.data.length >= 2,
  );
  // 12. Test: Pagination
  const paginatedReports =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: community.id,
          status: "pending",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedReports);
  TestValidator.equals(
    "pagination limit respected",
    paginatedReports.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination info provided",
    paginatedReports.pagination.current === 1,
  );
}
