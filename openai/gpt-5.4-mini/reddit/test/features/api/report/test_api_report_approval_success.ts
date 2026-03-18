import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_approval_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const approved = await api.functional.communityPlatform.admin.reports.approve(
    adminConnection,
    {
      reportId,
    },
  );
  typia.assert(approved);
  TestValidator.equals("report id", approved.id, reportId);
  TestValidator.equals("report status", approved.status, "approved");
  TestValidator.predicate(
    "reviewed_at populated",
    approved.reviewed_at !== null,
  );
  TestValidator.predicate(
    "report has community reference",
    approved.community.id.length > 0 && approved.community.name.length > 0,
  );
  TestValidator.predicate("report has reason", approved.reason.length > 0);
  TestValidator.predicate(
    "report has target id",
    approved.target_id.length > 0,
  );
}
