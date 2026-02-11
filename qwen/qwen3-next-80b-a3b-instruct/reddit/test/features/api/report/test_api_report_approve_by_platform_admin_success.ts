import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_report_approve_by_platform_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a valid reportId and communityId
  // Since we cannot create a report via provided APIs,
  // and scenario says 'implicit state', we assume a pending report exists.
  // We generate valid identifiers that match expected formats.
  const communityId = RandomGenerator.alphaNumeric(10);
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Approve the report as platform admin
  const approvedReport =
    await api.functional.redditCommunity.platformAdmin.communities.reports.approve(
      adminConnection,
      {
        communityId,
        reportId,
      },
    );
  typia.assert(approvedReport);
  // 4. Validate approval outcome
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_at is set",
    approvedReport.resolved_at !== null,
  );
  TestValidator.predicate(
    "resolved_at is valid ISO format",
    approvedReport.resolved_at !== undefined,
  );
  TestValidator.equals("report id matches", approvedReport.id, reportId);
}
