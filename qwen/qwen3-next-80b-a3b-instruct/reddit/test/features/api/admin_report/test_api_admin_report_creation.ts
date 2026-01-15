import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfAdmins";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated with auth token internally
  // Step 2: Use admin connection to create report
  const report: ICommunityPlatformReportOfAdmins =
    await api.functional.communityPlatform.admin.report.of.admins.create(
      adminConnection,
    );
  // Step 3: Validate report creation and business logic
  typia.assert(report);
  TestValidator.equals("report status should be open", report.status, "open");
}
