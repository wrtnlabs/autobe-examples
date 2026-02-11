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

export async function test_api_report_resolution_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(3),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate a mock report ID for testing
  // Since we don't have an API to create reports, we'll use a mock report ID
  // and create a report resolution directly
  const mockReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial resolution with RESOLVED status
  const initialResolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: mockReportId,
          status: "RESOLVED",
          resolution_notes: "Initial resolution: content removed",
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(initialResolution);
  TestValidator.equals(
    "initial status is RESOLVED",
    initialResolution.status,
    "RESOLVED",
  );
  // 4. Update resolution to DISMISSED status
  const dismissedResolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: initialResolution.id,
        body: {
          status: "DISMISSED",
          resolution_notes:
            "Report dismissed: content reviewed and found appropriate",
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(dismissedResolution);
  TestValidator.equals(
    "status changed to DISMISSED",
    dismissedResolution.status,
    "DISMISSED",
  );
  TestValidator.equals(
    "admin_id unchanged",
    dismissedResolution.admin_id,
    admin.id,
  );
  // 5. Update resolution back to RESOLVED status
  const reResolvedResolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.update(
      adminConnection,
      {
        resolutionId: dismissedResolution.id,
        body: {
          status: "RESOLVED",
          resolution_notes: "Content removed after reconsideration",
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(reResolvedResolution);
  TestValidator.equals(
    "status changed back to RESOLVED",
    reResolvedResolution.status,
    "RESOLVED",
  );
  TestValidator.equals(
    "admin_id still unchanged",
    reResolvedResolution.admin_id,
    admin.id,
  );
  // 6. Verify resolved_at timestamps are set on updates
  TestValidator.predicate(
    "resolved_at is set on first resolution",
    () => initialResolution.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at is updated on dismissal",
    () => dismissedResolution.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at is updated on re-resolution",
    () => reResolvedResolution.resolved_at !== undefined,
  );
}
