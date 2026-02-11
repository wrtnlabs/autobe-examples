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

export async function test_api_report_resolution_dismiss_without_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
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
  // 2. Create a report first using admin functionality
  // First create a member (reporter) to create a valid report
  const reporterConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.admin.join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Create a post for reporting (simplified - using admin function for demo)
  const post =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: typia.random<string & tags.Format<"uuid">>(),
          status: "RESOLVED",
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(post);
  // 3. Resolve the report with DISMISSED status and null notes
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: post.id,
          status: "DISMISSED",
          resolution_notes: null,
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolution);
  // 4. Validate resolution
  TestValidator.equals("status is DISMISSED", resolution.status, "DISMISSED");
  TestValidator.equals(
    "resolution_notes is null",
    resolution.resolution_notes,
    null,
  );
  TestValidator.predicate("has valid admin", resolution.admin.id !== undefined);
  TestValidator.predicate(
    "has valid report",
    resolution.report.id !== undefined,
  );
}
