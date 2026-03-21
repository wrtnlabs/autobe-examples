import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test that a moderator can filter community reports by status (pending, approved, dismissed)
 * and verify only matching reports are returned.
 *
 * Steps:
 * 1. Register and authenticate as member
 * 2. Create a new community
 * 3. Create two posts in the community
 * 4. Submit two separate reports against both posts
 * 5. Approve one report to change its status
 * 6. Query reports with status='pending' filter - should return only unprocessed report
 * 7. Query reports with status='approved' filter - should return the approved report
 * 8. Query reports without filter - should return all reports sorted by created_at DESC
 * 9. Verify each query returns correct pagination metadata
 */
export async function test_api_report_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a new community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create two posts in the community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post2);
  // 4. Submit two separate reports against both posts
  const report1 =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          target_type: "post",
          target_id: post1.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report1);
  const report2 =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          target_type: "post",
          target_id: post2.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report2);
  // 5. Approve one report to change its status
  const approvedReport =
    await api.functional.redditClone.member.reports.approve(memberConnection, {
      reportId: report1.id,
    });
  typia.assert(approvedReport);
  TestValidator.equals(
    "report status should be approved",
    approvedReport.status,
    "approved",
  );
  // 6. Query reports with status='pending' filter - should return only unprocessed report
  const pendingReports =
    await api.functional.redditClone.member.communities.reports.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(pendingReports);
  TestValidator.equals(
    "should return 1 pending report",
    pendingReports.data.length,
    1,
  );
  TestValidator.equals(
    "pending report should be report2",
    pendingReports.data[0].id,
    report2.id,
  );
  TestValidator.equals(
    "pending report should have pending status",
    pendingReports.data[0].status,
    "pending",
  );
  // 7. Query reports with status='approved' filter - should return the approved report
  const approvedReports =
    await api.functional.redditClone.member.communities.reports.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(approvedReports);
  TestValidator.equals(
    "should return 1 approved report",
    approvedReports.data.length,
    1,
  );
  TestValidator.equals(
    "approved report should be report1",
    approvedReports.data[0].id,
    report1.id,
  );
  TestValidator.equals(
    "approved report should have approved status",
    approvedReports.data[0].status,
    "approved",
  );
  // 8. Query reports without filter - should return all reports sorted by created_at DESC
  const allReports =
    await api.functional.redditClone.member.communities.reports.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allReports);
  TestValidator.equals(
    "should return all 2 reports",
    allReports.data.length,
    2,
  );
  // Verify pagination metadata for filtered results
  TestValidator.predicate(
    "pending reports pagination has valid metadata",
    pendingReports.pagination.records >= 1 &&
      pendingReports.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "approved reports pagination has valid metadata",
    approvedReports.pagination.records >= 1 &&
      approvedReports.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "all reports pagination has valid metadata",
    allReports.pagination.records === 2 && allReports.pagination.pages === 1,
  );
  // Verify the approved report has resolved information
  TestValidator.predicate(
    "approved report should have resolvedBy",
    allReports.data.find((r) => r.id === report1.id)?.resolvedBy !== undefined,
  );
}
