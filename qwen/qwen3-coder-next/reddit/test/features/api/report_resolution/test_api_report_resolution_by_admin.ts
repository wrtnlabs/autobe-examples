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

export async function test_api_report_resolution_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - establish admin session
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
  // 2. Use a dummy report ID (since we can't create actual test data with available APIs)
  const dummyReportId = "00000000-0000-0000-0000-000000000000";
  // 3. Admin retrieves report before resolution
  const retrievedReport =
    await api.functional.redditPlatform.admin.redditPlatform.reports.at(
      adminConnection,
      {
        reportId: dummyReportId,
      },
    );
  typia.assert(retrievedReport);
  TestValidator.equals("report matches", retrievedReport.id, dummyReportId);
  TestValidator.equals(
    "report status pending",
    retrievedReport.status,
    "PENDING",
  );
  // 4. Admin resolves report (APPROVED - remove content)
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reports.resolutions.update(
      adminConnection,
      {
        reportId: dummyReportId,
        body: {
          status: "RESOLVED",
          resolution_notes: "Reported content violated community guidelines",
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(resolution);
  // 5. Validate resolution
  TestValidator.equals("resolution status", resolution.status, "RESOLVED");
  TestValidator.equals(
    "resolution notes",
    resolution.resolution_notes,
    "Reported content violated community guidelines",
  );
  // 6. Test report dismissal (alternative resolution path)
  const dummyReportId2 = "00000000-0000-0000-0000-000000000001";
  const resolution2 =
    await api.functional.redditPlatform.admin.redditPlatform.reports.resolutions.update(
      adminConnection,
      {
        reportId: dummyReportId2,
        body: {
          status: "DISMISSED",
          resolution_notes: "Report determined to be invalid",
        } satisfies IRedditPlatformReportResolution.IUpdate,
      },
    );
  typia.assert(resolution2);
  // Verify dismissal
  TestValidator.equals("resolution2 status", resolution2.status, "DISMISSED");
}
