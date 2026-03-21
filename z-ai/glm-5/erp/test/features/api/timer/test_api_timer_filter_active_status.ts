import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_filter_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Query timers with isActive=true to get only active (running) timers
  const activeTimersResponse = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        isActive: true,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(activeTimersResponse);
  // Verify all returned timers have active=true
  TestValidator.predicate(
    "all active timers have active=true",
    activeTimersResponse.data.every((timer) => timer.active === true),
  );
  // Query timers with isActive=false to get only stopped/discarded timers
  const inactiveTimersResponse =
    await api.functional.erpHrm.member.timers.index(memberConnection, {
      body: {
        isActive: false,
      } satisfies IErpHrmTimer.IRequest,
    });
  typia.assert(inactiveTimersResponse);
  // Verify all returned timers have active=false
  TestValidator.predicate(
    "all inactive timers have active=false",
    inactiveTimersResponse.data.every((timer) => timer.active === false),
  );
  // Query all timers without isActive filter for comparison
  const allTimersResponse = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(allTimersResponse);
  // Verify that active + inactive counts match total count
  TestValidator.equals(
    "active + inactive counts match total",
    activeTimersResponse.pagination.records +
      inactiveTimersResponse.pagination.records,
    allTimersResponse.pagination.records,
  );
}
