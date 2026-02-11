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
 * Test successful update of a report resolution by an admin with proper authorization.
 * The scenario involves:
 * 1. Admin registration
 * 2. Create initial report resolution
 * 3. Update the resolution status from RESOLVED to DISMISSED
 * 4. Verify the update is persisted correctly
 */
export async function test_api_report_resolution_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: RandomGenerator.name(),
    display_name: null,
    bio: null,
  } satisfies IRedditPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // 2. Create initial report resolution
  const resolutionBody = {
    report_id: typia.random<string & tags.Format<"uuid">>(),
    status: "RESOLVED" as const,
    resolution_notes: "Initial resolution: Content removed",
  } satisfies IRedditPlatformReportResolution.ICreate;
  const initialResolution =
    await generate_random_reddit_platform_admin_reddit_platform_report_resolutions_create(
      adminConnection,
      { body: resolutionBody },
    );
  typia.assert(initialResolution);
  TestValidator.equals(
    "initial status is RESOLVED",
    initialResolution.status,
    "RESOLVED",
  );
  // 3. Update the resolution status from RESOLVED to DISMISSED
  const updateBody = {
    status: "DISMISSED" as const,
    resolution_notes: "Updated resolution: Dismissed due to false report",
  } satisfies IRedditPlatformReportResolution.IUpdate;
  const updatedResolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: initialResolution.id,
        body: updateBody,
      },
    );
  typia.assert(updatedResolution);
  // 4. Verify the update
  TestValidator.equals(
    "status changed to DISMISSED",
    updatedResolution.status,
    "DISMISSED",
  );
  TestValidator.equals(
    "resolution notes updated",
    updatedResolution.resolution_notes,
    "Updated resolution: Dismissed due to false report",
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedResolution.updated_at).getTime() >
      new Date(updatedResolution.created_at).getTime(),
  );
  TestValidator.equals(
    "admin_id matches",
    updatedResolution.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "report_id matches",
    updatedResolution.report.id,
    initialResolution.report_id,
  );
}
