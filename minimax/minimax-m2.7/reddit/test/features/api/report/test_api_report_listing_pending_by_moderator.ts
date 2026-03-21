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
 * Test that a moderator can successfully retrieve all pending reports from their community.
 *
 * Steps:
 * 1. Register and authenticate as a member
 * 2. Create a new community (authenticated member becomes owner)
 * 3. Create a post in the community
 * 4. Submit a report against the post with a reason
 * 5. Retrieve reports for the community with status='pending' filter
 * 6. Verify the response contains the submitted report with correct details:
 *    - Report status is 'pending'
 *    - Reporter username is captured
 *    - Target type is 'post'
 *    - Target preview includes post title
 *    - Reason text is included
 *    - Pagination metadata is correct
 */
export async function test_api_report_listing_pending_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member (who will be community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new community (authenticated member becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 4. Submit a report against the post with a reason
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: reportReason,
        },
      },
    );
  typia.assert(report);
  // 5. Retrieve reports for the community with status='pending' filter
  const reportsResponse =
    await api.functional.redditClone.member.communities.reports.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(reportsResponse);
  // 6. Verify the response contains the submitted report with correct details
  TestValidator.equals(
    "pagination exists",
    reportsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has at least one report",
    reportsResponse.data.length >= 1,
  );
  // Find the report we just created
  const foundReport = reportsResponse.data.find((r) => r.id === report.id);
  TestValidator.predicate("report found in list", foundReport !== undefined);
  if (foundReport) {
    // Verify report status is 'pending'
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
    // Verify target type is 'post'
    TestValidator.equals("target type is post", foundReport.targetType, "post");
    // Verify target ID matches our post
    TestValidator.equals(
      "target ID matches post",
      foundReport.targetId,
      post.id,
    );
    // Verify reporter username is captured
    TestValidator.equals(
      "reporter username is the member's username",
      foundReport.reporter.username,
      authorized.username,
    );
    // Verify reason text is included
    TestValidator.equals(
      "reason matches submitted",
      foundReport.reason,
      reportReason,
    );
    // Verify community matches
    TestValidator.equals(
      "community name matches",
      foundReport.community.name,
      community.name,
    );
    // Verify target preview includes post information
    TestValidator.predicate(
      "target preview exists for post",
      foundReport.targetPreview !== undefined,
    );
  }
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "current page >= 1",
    reportsResponse.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", reportsResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 1",
    reportsResponse.pagination.records >= 1,
  );
  TestValidator.predicate("pages >= 1", reportsResponse.pagination.pages >= 1);
}
