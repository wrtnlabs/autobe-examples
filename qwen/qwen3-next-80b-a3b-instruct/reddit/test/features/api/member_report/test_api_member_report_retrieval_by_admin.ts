import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportOfMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMembers";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_report_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinData });
  // Step 2: Create a test report ID (simulated since no report creation API is provided)
  // Due to lack of report creation endpoint in API, we must use a random UUID as placeholder
  // In real scenario, a report would be created first via platform actions
  const logId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Admin user retrieves the report - should succeed
  const retrievedReport: ICommunityPlatformReportOfMembers =
    await api.functional.communityPlatform.report.of.members.at(
      adminConnection,
      { logId },
    );
  typia.assert(retrievedReport);
  TestValidator.equals("report ID matches", retrievedReport.id, logId);
  // Step 4: Unauthenticated connection tries to retrieve the same report - should fail with 403
  // Create base connection (unauthenticated)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot access report",
    async () => {
      await api.functional.communityPlatform.report.of.members.at(
        unauthenticatedConnection,
        { logId },
      );
    },
  );
}
