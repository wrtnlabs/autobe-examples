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
 * Test successful post report creation workflow.
 *
 * Scenario: A member joins the platform, creates a community (becoming owner),
 * subscribes to it, creates a post, then reports that post with a valid reason.
 * Verify the report is created with PENDING status, correct content_type ('POST'),
 * the post's content_id, and the provided reason.
 */
export async function test_api_report_post_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Reporter joins the platform
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 2. Reporter creates a community (becomes owner)
  const community = await generate_random_community_member_communities_create(
    reporterConnection,
    {},
  );
  typia.assert(community);
  // 3. Reporter subscribes to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      reporterConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Reporter creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    reporterConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Reporter reports the post
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report = await generate_random_community_member_reports_create(
    reporterConnection,
    {
      body: {
        content_type: "POST",
        content_id: post.id,
        reason: reportReason,
      },
    },
  );
  typia.assert(report);
  // 6. Verify report details
  TestValidator.equals("content_type is POST", report.content_type, "POST");
  TestValidator.equals("content_id matches post", report.content_id, post.id);
  TestValidator.equals("reason matches", report.reason, reportReason);
  TestValidator.equals("status is PENDING", report.status, "PENDING");
  TestValidator.equals("community matches", report.community.id, community.id);
  TestValidator.equals("reporter matches", report.reporter.id, reporter.id);
}
