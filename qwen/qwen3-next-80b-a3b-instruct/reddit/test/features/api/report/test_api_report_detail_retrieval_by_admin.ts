import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_report_detail_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin using authorize_admin_join (utility function with priority over SDK)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join", // Required URI format
      referrer: "https://example.com", // Required URI format
      ip: null, // Optional, explicitly set to null
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally with auth token
  // Step 3: Use a valid report ID (assumed to exist in test environment)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve the report using the report ID
  const retrievedReport =
    await api.functional.communityPlatform.admin.reports.at(adminConnection, {
      reportId: reportId,
    });
  typia.assert(retrievedReport);
}
