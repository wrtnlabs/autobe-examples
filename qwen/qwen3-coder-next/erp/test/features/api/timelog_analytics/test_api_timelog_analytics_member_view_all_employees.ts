import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_analytics_member_view_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with time:view_all permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create additional employee in same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // 3. Test analytics without employee_id filter (org-wide view)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const allTimelogs = await api.functional.hrmTracker.member.timelogs.analytics(
    memberConnection,
    {
      body: {
        start_date: yesterday.toISOString(),
        end_date: today.toISOString(),
      } satisfies IHrmTrackerTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  // 4. Test analytics with employee_id filter (still works with org-wide permissions)
  const filteredTimelogs =
    await api.functional.hrmTracker.member.timelogs.analytics(
      memberConnection,
      {
        body: {
          employee_id: employee.id,
          start_date: yesterday.toISOString(),
          end_date: today.toISOString(),
        } satisfies IHrmTrackerTimelog.IRequest,
      },
    );
  typia.assert(filteredTimelogs);
}
