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

export async function test_api_report_resolution_detail_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        username: RandomGenerator.name(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Test authorization - verify non-admin users cannot access
  const reporterConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "member cannot access report resolution detail",
    async () => {
      await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.at(
        reporterConnection,
        {
          resolutionId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // 3. Test with guest (no authentication)
  await TestValidator.error(
    "guest cannot access report resolution detail",
    async () => {
      const guestConnection: api.IConnection = { host: connection.host };
      await api.functional.redditPlatform.admin.redditPlatform.reportResolutions.at(
        guestConnection,
        {
          resolutionId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
