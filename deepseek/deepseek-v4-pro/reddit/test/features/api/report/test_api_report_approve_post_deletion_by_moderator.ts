import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_reports_create } from "../../../generate/generate_random_community_hub_member_reports_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_report } from "../../../prepare/prepare_random_community_hub_report";

/**
 * Test that a community moderator (owner) can approve a pending report on a post,
 * resulting in the post being soft-deleted and the report status transitioning from
 * 'pending' to 'approved'.
 *
 * Verifies the complete report approval workflow: a community owner creates a
 * community and posts content, a second member reports the post, and the owner
 * approves the report acting as moderator. This covers the full lifecycle from
 * content creation through moderation action including status transition and
 * timestamp updates.
 *
 * 1. Owner registers and creates a community, becoming its permanent owner.
 * 2. Owner subscribes to the community and creates a text post within it.
 * 3. A second member registers and files a report against the owner's post.
 * 4. The owner approves the report, transitioning its status to 'approved'.
 * 5. Validates the report id remains consistent, status is 'approved', and the
 *    updated_at timestamp has changed from the original value.
 */
export async function test_api_report_approve_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner (moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Owner subscribes to the community
  await api.functional.communityHub.member.communities.subscriptions.create(
    ownerConnection,
    { communityName: community.name },
  );
  // 4. Owner creates a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Register a second member (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 6. Reporter files a report against the owner's post
  const report = await generate_random_community_hub_member_reports_create(
    reporterConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason: "This post violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 7. Owner (moderator) approves the report
  const approvedReport =
    await api.functional.communityHub.member.reports.approve(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(approvedReport);
  // 8. Validate the approval result
  TestValidator.equals("report id unchanged", approvedReport.id, report.id);
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.notEquals(
    "report updated_at has changed",
    approvedReport.updated_at,
    report.updated_at,
  );
}
