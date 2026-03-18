import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingTimelogReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelogReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelogReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelogReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_report_view_permission_required(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const request = {
    dateFrom: "2026-01-01",
    dateTo: "2026-01-07",
    groupBy: "employee",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingTimelogReport.IRequest;
  await TestValidator.httpError(
    "report view permission required",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.reports.time.index(
        memberConnection,
        { body: request },
      );
    },
  );
}
