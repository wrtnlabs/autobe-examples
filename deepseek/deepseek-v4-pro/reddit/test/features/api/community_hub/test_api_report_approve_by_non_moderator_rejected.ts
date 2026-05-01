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
 * Test that a non-moderator member cannot approve a content report.
 *
 * Validates the authorization boundary for report approval — only moderators
 * (community owner or appointed moderators) may approve reports, while
 * ordinary members receive a 403 Forbidden response. This enforces the access
 * control described in section 291 of the specification: "If a non-moderator
 * user attempts to approve or dismiss a report, the request is rejected with
 * a message indicating moderator privileges are required."
 *
 * 1. Owner registers, creates a community, subscribes, and publishes a text post.
 * 2. A second member registers, subscribes to the same community, and files a
 *    report against the owner's post with a written reason.
 * 3. The second member (non-moderator) attempts to approve the report and
 *    receives HTTP 403 Forbidden.
 */
export async function test_api_report_approve_by_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup: register, create community, subscribe, publish post
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  const ownerSubscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      ownerConnection,
      { communityName: community.name },
    );
  typia.assert(ownerSubscription);
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { type: "text" },
    },
  );
  typia.assert(post);
  // 2. Reporter setup: register, subscribe, file report against the post
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  const reporterSubscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      reporterConnection,
      { communityName: community.name },
    );
  typia.assert(reporterSubscription);
  const report = await generate_random_community_hub_member_reports_create(
    reporterConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 3. Non-moderator (reporter) attempts to approve → 403 Forbidden
  await TestValidator.httpError(
    "non-moderator approve rejected with 403",
    403,
    async () => {
      await api.functional.communityHub.member.reports.approve(
        reporterConnection,
        { reportId: report.id },
      );
    },
  );
}
