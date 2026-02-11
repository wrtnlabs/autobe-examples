import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
import { generate_random_reddit_platform_member_reddit_platform_report_resolutions_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_report_resolutions_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";
import { prepare_random_reddit_platform_report_resolution } from "../../../prepare/prepare_random_reddit_platform_report_resolution";

export async function test_api_report_resolution_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member (reporter)
  const memberConnection: api.IConnection = { host: connection.host };
  const reporter = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(reporter);
  // 2. Create admin (moderator)
  const adminConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(moderator);
  // 3. Reporter creates a post to report
  const createdPost =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST",
          reported_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(createdPost);
  // 4. Admin resolves the report
  const resolution =
    await api.functional.redditPlatform.member.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: createdPost.id,
          status: "RESOLVED",
          resolution_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolution);
  // 5. Validate resolution
  TestValidator.equals(
    "report_id matches",
    resolution.report_id,
    createdPost.id,
  );
  TestValidator.equals("status is RESOLVED", resolution.status, "RESOLVED");
  TestValidator.predicate(
    "has resolution notes",
    resolution.resolution_notes !== null,
  );
  TestValidator.equals(
    "moderator username matches",
    resolution.admin.username,
    moderator.username,
  );
}
