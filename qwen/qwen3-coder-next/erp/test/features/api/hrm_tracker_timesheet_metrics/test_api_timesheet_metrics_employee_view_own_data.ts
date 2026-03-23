import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_metrics_employee_view_own_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Log in with member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedMember = await authorize_member_login(loginConnection, {
    body: {
      email: member.email,
      password: "12345678",
      href: connection.host,
      referrer: connection.host,
    },
  });
  typia.assert(loggedMember);
  // 3. Test timesheet metrics endpoint
  const today = new Date().toISOString().split("T")[0];
  const metrics =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      loginConnection,
      {
        body: {
          status: "submitted",
          week_start_date: today,
          week_end_date: today,
          employee_id: loggedMember.id,
          page: 1,
          limit: 10,
          search: "",
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(metrics);
  // 4. Validate member can only see their own data
  TestValidator.equals(
    "member can only see their own timesheet metrics",
    metrics.data.every((item) => item.employee_id === loggedMember.id),
    true,
  );
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination structure is correct",
    metrics.pagination.records >= 0,
    true,
  );
  TestValidator.predicate(
    "current page is at least 1",
    metrics.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is within valid range",
    metrics.pagination.limit >= 1 && metrics.pagination.limit <= 100,
  );
}