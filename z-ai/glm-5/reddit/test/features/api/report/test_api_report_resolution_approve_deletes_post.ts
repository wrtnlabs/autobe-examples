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

export async function test_api_report_resolution_approve_deletes_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a community (automatically becomes owner/moderator)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Member A subscribes to their own community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // Step 4: Member A creates a text post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: {
        post_type: "TEXT",
        title: RandomGenerator.name(),
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Step 5: Member A creates a report on their own post
  const report = await generate_random_community_member_reports_create(
    memberAConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // Verify report is in PENDING status before resolution
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  // Step 6: Member A resolves the report with action='APPROVE'
  const resolutionNotes = "Content violates community guidelines";
  const resolution =
    await generate_random_community_member_reports_resolution_resolve(
      memberAConnection,
      {
        params: { reportId: report.id },
        body: {
          action: "APPROVE",
          notes: resolutionNotes,
        },
      },
    );
  typia.assert(resolution);
  // Validations
  // 1. Response returns ICommunityReportResolution with action='APPROVE'
  TestValidator.equals(
    "resolution action is APPROVE",
    resolution.action,
    "APPROVE",
  );
  // 2. Resolution record includes moderator info (Member A's profile summary)
  TestValidator.equals(
    "moderator is Member A",
    resolution.moderator.id,
    memberA.id,
  );
  // 3. Resolution record includes report summary showing status changed to APPROVED
  TestValidator.equals(
    "report status is APPROVED",
    resolution.report.status,
    "APPROVED",
  );
  TestValidator.equals("report id matches", resolution.report.id, report.id);
  TestValidator.equals(
    "report content type matches",
    resolution.report.content_type,
    "POST",
  );
  TestValidator.equals(
    "report content id matches",
    resolution.report.content_id,
    post.id,
  );
  // 4. The reported post is deleted (attempting to report it again should fail)
  await TestValidator.error(
    "post should be deleted after APPROVE",
    async () => {
      await generate_random_community_member_reports_create(memberAConnection, {
        body: {
          content_type: "POST",
          content_id: post.id,
          reason: "Another report attempt on deleted post",
        },
      });
    },
  );
  // 5. Resolution timestamp is recorded
  TestValidator.predicate(
    "resolution has valid timestamp",
    resolution.created_at.length > 0,
  );
  // 6. Optional notes are stored correctly
  TestValidator.equals("notes are stored", resolution.notes, resolutionNotes);
}
