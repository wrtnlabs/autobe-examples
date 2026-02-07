import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_sort_by_status_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // 2. Retrieve reports sorted by status
  const sortedReports =
    await api.functional.communityPlatform.member.reports.index(
      memberConnection,
      {
        body: {
          sort_by: "status",
          size: 5,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(sortedReports);
  // 3. Verify status order
  const expectedStatusOrder = [
    "new",
    "pending",
    "processing",
    "approved",
    "dismissed",
  ];
  const actualStatusOrder = sortedReports.data.map(
    (report) => (report as any).status,
  );
  TestValidator.equals(
    "Report status order matches expected sequence",
    actualStatusOrder,
    expectedStatusOrder,
  );
}
