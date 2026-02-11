import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_filter_partial_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      username: RandomGenerator.name(),
    } satisfies ICommunityAdmin.IJoin,
  });
  // 2. Test filtering with partial reason text
  const filterResult = await api.functional.community.admin.reports.index(
    adminConnection,
    {
      body: {
        reason: "inappropriate",
        page: 1,
        limit: 20,
      } satisfies ICommunityReport.IRequest,
    },
  );
  typia.assert(filterResult);
  // 3. Verify results
  TestValidator.predicate(
    "Reports should be found with the partial reason",
    filterResult.data.length > 0,
  );
  for (const report of filterResult.data) {
    TestValidator.predicate(
      "Reason should be truncated to ≤ 30 characters",
      report.reason.length <= 30,
    );
    TestValidator.predicate(
      "Reason should contain 'inappropriate' as partial match",
      report.reason.includes("inappropriate"),
    );
  }
}
