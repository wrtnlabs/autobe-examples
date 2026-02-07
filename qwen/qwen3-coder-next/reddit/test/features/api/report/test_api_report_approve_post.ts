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

export async function test_api_report_approve_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // 2. Create a report (requires post first)
  // Since we need a report to approve, we need to first create a post
  // and then report it. However, the DTOs provided don't include
  // IRedditPlatformPost or IRedditPlatformReport types with ICreate variants.
  // We only have IRedditPlatformReport.IApproval and IRedditPlatformReport.IResolution.
  // This scenario requires additional API functions that aren't available.
  // For now, we'll test the approve endpoint directly with a mock report ID.
  // In a real scenario, you would first create content, then report it.
  // 3. Approve the report
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const result: IRedditPlatformReport.IResolution =
    await api.functional.redditPlatform.admin.reports.approve(adminConnection, {
      reportId,
      body: typia.random<IRedditPlatformReport.IApproval>(),
    });
  // 4. Validate response
  typia.assert(result);
}
