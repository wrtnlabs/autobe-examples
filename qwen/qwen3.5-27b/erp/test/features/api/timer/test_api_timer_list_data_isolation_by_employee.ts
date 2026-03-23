import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timer data isolation by employee - each employee can only see their own timers.
 *
 * This test verifies that the timer listing endpoint enforces proper data isolation
 * at the database level, ensuring employees cannot access other employees' timer records.
 */
export async function test_api_timer_list_data_isolation_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(member1Auth);
  // 2. Register member2
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        href: "https://test.com/join",
        referrer: "https://test.com",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(member2Auth);
  // 3. Member1 fetches their timers
  const member1Timers: IPageIHrmPlatformTimer.ISummary =
    await api.functional.hrmPlatform.member.timers.index(member1Connection, {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(member1Timers);
  // 4. Member2 fetches their timers
  const member2Timers: IPageIHrmPlatformTimer.ISummary =
    await api.functional.hrmPlatform.member.timers.index(member2Connection, {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(member2Timers);
  // 5. Verify data isolation: member1's timers should not contain member2's employee
  TestValidator.predicate(
    "member1 timers only contain member1's employee",
    member1Timers.data.every(
      (timer) =>
        timer.employee.member.id === member1Auth.id &&
        timer.employee.member.email === member1Auth.email,
    ),
  );
  // 6. Verify data isolation: member2's timers should not contain member1's employee
  TestValidator.predicate(
    "member2 timers only contain member2's employee",
    member2Timers.data.every(
      (timer) =>
        timer.employee.member.id === member2Auth.id &&
        timer.employee.member.email === member2Auth.email,
    ),
  );
  // 7. Verify no cross-contamination: timer IDs should be completely separate
  const member1TimerIds = new Set(member1Timers.data.map((t) => t.id));
  const member2TimerIds = new Set(member2Timers.data.map((t) => t.id));
  TestValidator.predicate(
    "member1 and member2 timer IDs are completely disjoint",
    [...member1TimerIds].every((id) => !member2TimerIds.has(id)) &&
      [...member2TimerIds].every((id) => !member1TimerIds.has(id)),
  );
  // 8. Test with status filter - active timers
  const member1ActiveTimers: IPageIHrmPlatformTimer.ISummary =
    await api.functional.hrmPlatform.member.timers.index(member1Connection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(member1ActiveTimers);
  TestValidator.predicate(
    "member1 active timers only contain member1's employee",
    member1ActiveTimers.data.every(
      (timer) =>
        timer.employee.member.id === member1Auth.id &&
        timer.employee.member.email === member1Auth.email,
    ),
  );
  // 9. Test with status filter - stopped timers
  const member2StoppedTimers: IPageIHrmPlatformTimer.ISummary =
    await api.functional.hrmPlatform.member.timers.index(member2Connection, {
      body: {
        status: "stopped",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(member2StoppedTimers);
  TestValidator.predicate(
    "member2 stopped timers only contain member2's employee",
    member2StoppedTimers.data.every(
      (timer) =>
        timer.employee.member.id === member2Auth.id &&
        timer.employee.member.email === member2Auth.email,
    ),
  );
  // 10. Verify pagination metadata is correct
  TestValidator.equals(
    "member1 pagination records matches data length",
    member1Timers.pagination.records,
    member1Timers.data.length,
  );
  TestValidator.equals(
    "member2 pagination records matches data length",
    member2Timers.pagination.records,
    member2Timers.data.length,
  );
}
