import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import type { ICommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReportResolution";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_member_reports_create } from "../../../generate/generate_random_community_member_reports_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";

/**
 * Test retrieving resolution details for an approved content report.
 *
 * This test validates the primary success path where a community owner
 * retrieves resolution details after approving a content report. The scenario
 * verifies:
 * - The resolution object contains all required fields (id, action, notes, created_at)
 * - The moderator object contains the resolving moderator's profile summary
 * - The report object contains the original report summary with correct status
 * - The resolution action matches APPROVE
 * - Optional notes provided during approval are preserved
 */
export async function test_api_report_resolution_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Owner creates account and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    { body: {} },
  );
  typia.assert(community);
  // Step 2: Owner subscribes to their own community (required for posting)
  await api.functional.community.member.communities.subscribe(ownerConnection, {
    communityName: community.name,
  });
  // Step 3: Owner creates a post that will be reported
  const post = await generate_random_community_member_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { post_type: "TEXT" },
    },
  );
  typia.assert(post);
  // Step 4: Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // Step 5: Reporter subscribes to the community
  await api.functional.community.member.communities.subscribe(
    reporterConnection,
    { communityName: community.name },
  );
  // Step 6: Reporter creates a report for the post
  const report = await generate_random_community_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
      },
    },
  );
  typia.assert(report);
  // Step 7: Owner (as moderator) approves the report with notes
  const approvalNotes = "Content violates community guidelines - spam post";
  const resolution = await api.functional.community.member.reports.approve(
    ownerConnection,
    {
      reportId: report.id,
      body: { notes: approvalNotes } satisfies ICommunityReport.IApprove,
    },
  );
  typia.assert(resolution);
  // Step 8: Retrieve the resolution details
  const resolutionDetails =
    await api.functional.community.member.reports.resolution(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(resolutionDetails);
  // Step 9: Validate resolution object structure
  TestValidator.equals(
    "resolution id is valid UUID",
    resolutionDetails.id.length,
    36,
  );
  TestValidator.equals(
    "resolution action is APPROVE",
    resolutionDetails.action,
    "APPROVE",
  );
  TestValidator.equals(
    "resolution notes preserved",
    resolutionDetails.notes,
    approvalNotes,
  );
  TestValidator.predicate(
    "resolution has created_at timestamp",
    resolutionDetails.created_at.length > 0,
  );
  // Step 10: Validate moderator information
  TestValidator.equals(
    "moderator id matches owner",
    resolutionDetails.moderator.id,
    owner.id,
  );
  TestValidator.equals(
    "moderator username matches owner",
    resolutionDetails.moderator.username,
    owner.username,
  );
  // Step 11: Validate report summary in resolution
  TestValidator.equals(
    "report id matches",
    resolutionDetails.report.id,
    report.id,
  );
  TestValidator.equals(
    "report content_type is POST",
    resolutionDetails.report.content_type,
    "POST",
  );
  TestValidator.equals(
    "report content_id matches post",
    resolutionDetails.report.content_id,
    post.id,
  );
  TestValidator.equals(
    "report status is APPROVED",
    resolutionDetails.report.status,
    "APPROVED",
  );
  // Step 12: Validate reporter information in report summary
  TestValidator.equals(
    "reporter id matches",
    resolutionDetails.report.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reporter username matches",
    resolutionDetails.report.reporter.username,
    reporter.username,
  );
}
