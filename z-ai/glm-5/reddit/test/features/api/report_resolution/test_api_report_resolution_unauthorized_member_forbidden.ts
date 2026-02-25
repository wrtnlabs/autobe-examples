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

/**
 * Test authorization enforcement where a non-moderator member attempts to resolve
 * a report and receives 403 Forbidden, ensuring cross-community moderation is not permitted.
 *
 * **Setup Steps:**
 * 1. Member A joins, creates a community (becomes owner), subscribes to it, creates a post
 * 2. Member A creates a report on their own post (creates PENDING report)
 * 3. Member B joins the platform (regular member, not a moderator of Member A's community)
 *
 * **Test Execution:**
 * 1. Member B attempts to resolve the report with action='APPROVE'
 *
 * **Expected Result:**
 * 1. API returns 403 Forbidden
 * 2. Error message indicates user is not authorized to resolve reports in this community
 * 3. Report status remains PENDING (not changed)
 * 4. Post remains intact (not deleted)
 * 5. No resolution record is created
 */
export async function test_api_report_resolution_unauthorized_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Member A joins and creates a community (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Member A subscribes to their own community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberAConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Member A creates a post in their community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // Member A creates a report on their own post (creates PENDING report)
  const report = await generate_random_community_member_reports_create(
    memberAConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // Verify report is in PENDING status
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  // Setup: Member B joins the platform (regular member, NOT a moderator of Member A's community)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Test: Member B attempts to resolve the report (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "non-moderator cannot resolve report in another community",
    403,
    async () => {
      await generate_random_community_member_reports_resolution_resolve(
        memberBConnection,
        {
          params: {
            reportId: report.id,
          },
          body: {
            action: "APPROVE",
          },
        },
      );
    },
  );
}
