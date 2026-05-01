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
 * Test that a community owner (automatic moderator) can retrieve a content report by ID.
 *
 * Validates the moderator-only report retrieval endpoint by having a community
 * owner create a report against their own post and then successfully fetch it.
 * The response must include the complete ICommunityHubReport with the reporter,
 * community, target content references, reason text, and pending status.
 *
 * 1. Member A registers and becomes authenticated.
 * 2. Member A creates a community, becoming its owner and automatic moderator.
 * 3. Member A subscribes to the community to enable post creation.
 * 4. Member A creates a text post within the community.
 * 5. Member A files a report against the post with an explicit reason.
 * 6. Member A retrieves the report by its reportId as the community moderator.
 * 7. Validates all report fields match the created data and status is pending.
 */
export async function test_api_report_retrieval_by_owner_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (becomes owner and automatic moderator)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community to enable post creation
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Member A files a report against the post
  const reason =
    "This post contains content that should be reviewed by moderators.";
  const report = await generate_random_community_hub_member_reports_create(
    memberAConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason,
      },
    },
  );
  typia.assert(report);
  // 6. Member A retrieves the report by reportId (acting as community moderator)
  const retrievedReport = await api.functional.communityHub.member.reports.at(
    memberAConnection,
    { reportId: report.id },
  );
  typia.assert(retrievedReport);
  // 7. Validate business-level report data
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter matches",
    retrievedReport.reporter.id,
    memberA.id,
  );
  TestValidator.equals(
    "community matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "target_type is post",
    retrievedReport.target_type,
    "post",
  );
  TestValidator.equals("target_id matches", retrievedReport.target_id, post.id);
  TestValidator.equals("reason matches", retrievedReport.reason, reason);
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
}
