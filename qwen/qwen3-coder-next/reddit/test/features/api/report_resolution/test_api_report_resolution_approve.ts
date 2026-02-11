import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportResolution";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_resolution_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // 2. Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  // 3. Create a community for the test post
  const community = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    iconUrl: null,
    subscriberCount: 0,
  } satisfies IRedditPlatformCommunity.ISummary;
  // 4. Create a post as member (with simulated community)
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Submit a report for the post
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: post.id,
          reason: "Inappropriate content detected",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals("report status", report.status, "PENDING");
  // 6. Approve the report as admin
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reports.resolve(
      adminConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes: "Content violates community guidelines",
        } satisfies IRedditPlatformReportResolution.IRequest,
      },
    );
  typia.assert(resolution);
  // 7. Verify the resolution
  TestValidator.equals(
    "resolution status",
    resolution.status,
    "RESOLVED_APPROVED",
  );
  TestValidator.equals(
    "resolution notes",
    resolution.resolution_notes,
    "Content violates community guidelines",
  );
  TestValidator.equals("resolved_by_id", resolution.admin_id, admin.id);
  TestValidator.predicate(
    "resolved_at exists",
    resolution.resolved_at !== null,
  );
  TestValidator.equals(
    "reporter matches",
    resolution.report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reported_id matches",
    resolution.report.reported_id,
    post.id,
  );
  TestValidator.equals(
    "reported_type matches",
    resolution.report.reported_type,
    "POST",
  );
  TestValidator.equals(
    "report status matches",
    resolution.report.status,
    "APPROVED",
  );
  // Use resolved_at instead of resolvedById for ISummary
  TestValidator.predicate(
    "report resolved_at matches",
    resolution.report.resolved_at !== null,
  );
}
