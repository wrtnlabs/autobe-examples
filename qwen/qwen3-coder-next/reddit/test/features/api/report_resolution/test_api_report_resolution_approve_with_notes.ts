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
import { generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create } from "../../../generate/generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create";
import { prepare_random_reddit_platform_report_resolution } from "../../../prepare/prepare_random_reddit_platform_report_resolution";

export async function test_api_report_resolution_approve_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // 2. Create a report resolution with a generated report_id
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: reportId,
          status: "RESOLVED",
          resolution_notes:
            "This post was identified as spam and removed according to community guidelines.",
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolution);
  // 3. Validate resolution
  TestValidator.equals("report_id matches", resolution.report_id, reportId);
  TestValidator.equals("status is RESOLVED", resolution.status, "RESOLVED");
  TestValidator.equals(
    "resolution notes match",
    resolution.resolution_notes,
    "This post was identified as spam and removed according to community guidelines.",
  );
  TestValidator.predicate(
    "resolved_at exists",
    resolution.resolved_at !== null,
  );
}
