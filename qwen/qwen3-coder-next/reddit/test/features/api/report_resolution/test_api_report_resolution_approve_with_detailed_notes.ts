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

/**
 * Test report resolution approval with detailed notes workflow.
 * 1. Register admin account
 * 2. Login as admin
 * 3. Create a report resolution with approval status and detailed notes
 * 4. Verify resolution details
 */
export async function test_api_report_resolution_approve_with_detailed_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Login as admin
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: admin.email,
      password: "12345678",
    },
  });
  // 3. Create a report resolution with approval status and detailed notes
  const resolution =
    await generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create(
      adminAuthConnection,
      {
        body: {
          report_id: typia.random<string & tags.Format<"uuid">>(),
          status: "RESOLVED",
          resolution_notes: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolution);
  // 4. Verify resolution details
  TestValidator.equals(
    "resolution status is RESOLVED",
    resolution.status,
    "RESOLVED",
  );
  TestValidator.predicate(
    "resolution has report_id",
    resolution.report_id !== null && resolution.report_id !== undefined,
  );
  TestValidator.predicate(
    "resolution has admin_id",
    resolution.admin_id !== null && resolution.admin_id !== undefined,
  );
  TestValidator.predicate(
    "resolution has notes",
    resolution.resolution_notes !== null &&
      resolution.resolution_notes !== undefined,
  );
  TestValidator.predicate(
    "resolution has timestamp",
    resolution.resolved_at !== null && resolution.resolved_at !== undefined,
  );
  // 5. Verify report information (if available in resolution)
  if (resolution.report) {
    TestValidator.predicate(
      "resolution has report summary",
      resolution.report !== null && resolution.report !== undefined,
    );
  }
  // 6. Verify admin information
  if (resolution.admin) {
    TestValidator.predicate(
      "resolution has admin summary",
      resolution.admin !== null && resolution.admin !== undefined,
    );
  }
}
