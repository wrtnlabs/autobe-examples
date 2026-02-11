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

export async function test_api_admin_report_resolution_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin using SDK directly
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IRedditPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
    username: `admin_${RandomGenerator.alphabets(8)}`,
    display_name: null,
    bio: null,
  };
  const admin = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: adminCredentials,
    },
  );
  typia.assert(admin);
  // 2. Create a report resolution using available API
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  const resolution =
    await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.create(
      adminConnection,
      {
        body: {
          report_id: fakeReportId,
          status: "RESOLVED",
          resolution_notes: "This report was processed by automated test.",
        } satisfies IRedditPlatformReportResolution.ICreate,
      },
    );
  typia.assert(resolution);
  // 3. Delete the report resolution
  const deleteResponse =
    await api.functional.redditPlatform.admin.reportResolutions.erase(
      adminConnection,
      {
        resolutionId: resolution.id,
      },
    );
  typia.assert(deleteResponse);
  // 4. Verify deletion response
  TestValidator.equals(
    "delete message",
    deleteResponse.message,
    "Resolution deleted successfully",
  );
}
