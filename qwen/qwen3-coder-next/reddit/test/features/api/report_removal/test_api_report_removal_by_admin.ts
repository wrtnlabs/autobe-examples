import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.redditPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: "admin_user",
        display_name: "Admin User",
        bio: "System administrator",
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create a new connection with the admin token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = {
    authorization: admin.token.access,
  };
  // 3. Remove a report (using a generated report ID since we can't create reports)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.redditPlatform.admin.redditPlatform.reports.erase(
      adminAuthConnection,
      {
        reportId: reportId,
      },
    );
  typia.assert(result);
  // 4. Verify the result structure
  typia.assert<string & tags.Format<"uuid">>(result.id);
}
