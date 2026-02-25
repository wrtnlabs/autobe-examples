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
import { generate_random_community_member_reports_resolution_resolve } from "../../../generate/generate_random_community_member_reports_resolution_resolve";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_report } from "../../../prepare/prepare_random_community_report";
import { prepare_random_community_report_resolution } from "../../../prepare/prepare_random_community_report_resolution";

export async function test_api_report_resolution_dismiss_preserves_content(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Member A joins platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 1: Member A creates a community (becomes owner/moderator)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 2: Member A subscribes to their own community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Step 3: Member A creates a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        post_type: "TEXT",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Step 4: Member A creates a report on their own post
  const report = await generate_random_community_member_reports_create(
    memberAConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: "Suspected violation of community guidelines",
      },
    },
  );
  typia.assert(report);
  // Verify report status is PENDING
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  // Test Execution: Member A resolves the report with DISMISS action
  const resolutionNotes =
    "Content reviewed and does not violate community guidelines. Report dismissed.";
  const resolution =
    await generate_random_community_member_reports_resolution_resolve(
      memberAConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          action: "DISMISS",
          notes: resolutionNotes,
        },
      },
    );
  typia.assert(resolution);
  // Validation 1: Response returns ICommunityReportResolution with action='DISMISS'
  TestValidator.equals(
    "resolution action is DISMISS",
    resolution.action,
    "DISMISS",
  );
  // Validation 2: Resolution record includes moderator info (Member A's profile summary)
  TestValidator.equals(
    "moderator id matches",
    resolution.moderator.id,
    memberA.id,
  );
  TestValidator.equals(
    "moderator username matches",
    resolution.moderator.username,
    memberA.username,
  );
  // Validation 3: Resolution record includes report summary with DISMISSED status
  TestValidator.equals("report id matches", resolution.report.id, report.id);
  TestValidator.equals(
    "report status is DISMISSED",
    resolution.report.status,
    "DISMISSED",
  );
  // Validation 4: Resolution timestamp is recorded
  TestValidator.predicate(
    "resolution has valid timestamp",
    new Date(resolution.created_at) <= new Date(),
  );
  // Validation 5: Optional notes are stored correctly
  TestValidator.equals(
    "notes stored correctly",
    resolution.notes,
    resolutionNotes,
  );
  // Validation 6: Verify the reported post remains visible (can create another report on same post)
  // This demonstrates that dismissed reports allow re-reporting
  const secondReport = await generate_random_community_member_reports_create(
    memberAConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: "Second report after dismissal - content still available",
      },
    },
  );
  typia.assert(secondReport);
  TestValidator.equals(
    "second report created successfully",
    secondReport.status,
    "PENDING",
  );
  TestValidator.equals(
    "second report references same post",
    secondReport.content_id,
    post.id,
  );
}
