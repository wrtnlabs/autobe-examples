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

export async function test_api_report_resolution_dismiss(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IRedditPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(3),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const adminMember = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(adminMember);
  // 2. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IRedditPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(3),
  };
  const memberMember = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: memberCredentials,
    },
  );
  typia.assert(memberMember);
  // 3. Create a post in a community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT",
        content: RandomGenerator.paragraph({ sentences: 3 }),
        communityId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Submit a report for the post
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is PENDING", report.status, "PENDING");
  // 5. Admin resolves the report by dismissing it
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reports.resolve(
      adminConnection,
      {
        reportId: report.id,
        body: {
          resolution_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReportResolution.IRequest,
      },
    );
  typia.assert(resolution);
  // 6. Validate resolution results
  TestValidator.equals(
    "resolution status is DISMISSED",
    resolution.status,
    "DISMISSED",
  );
  TestValidator.equals(
    "resolution notes matches",
    resolution.resolution_notes,
    resolution.resolution_notes,
  );
  TestValidator.notEquals("report ID matches", resolution.report.id, report.id);
}
