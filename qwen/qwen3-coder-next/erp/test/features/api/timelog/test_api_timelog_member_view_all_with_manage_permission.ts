import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_timelogs_create } from "../../../generate/generate_random_hrm_tracker_member_timelogs_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_timelog } from "../../../prepare/prepare_random_hrm_tracker_timelog";

export async function test_api_timelog_member_view_all_with_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin member
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create employee for admin to establish organization context
  const adminEmployeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminMember.token.access },
  };
  const adminEmployee =
    await generate_random_hrm_tracker_member_employees_create(
      adminEmployeeConnection,
      {
        body: {
          employment_type: "full-time" as const,
          status: "active" as const,
          position: "Admin",
          department_id: null,
          role_id: null,
          organization_id: adminMember.id,
          user_id: adminMember.id,
        } satisfies IHrmTrackerEmployee.ICreate,
      },
    );
  typia.assert(adminEmployee);
  // 3. Create member with time:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 4. Create employee for member under same organization
  const memberEmployeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  const memberEmployee =
    await generate_random_hrm_tracker_member_employees_create(
      memberEmployeeConnection,
      {
        body: {
          employment_type: "full-time" as const,
          status: "active" as const,
          position: "Team Member",
          department_id: null,
          role_id: null,
          organization_id: adminEmployee.organization_id,
          user_id: member.id,
        } satisfies IHrmTrackerEmployee.ICreate,
      },
    );
  typia.assert(memberEmployee);
  // 5. Create test timelogs for the member
  const testTimelogs = await ArrayUtil.asyncRepeat(3, async () => {
    const timelog = await generate_random_hrm_tracker_member_timelogs_create(
      memberEmployeeConnection,
      {
        body: {
          date: new Date().toISOString(),
          duration_in_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          project_id: typia.random<string & tags.Format<"uuid">>(),
          task_id: null,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmTrackerTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    return timelog;
  });
  // 6. Member with time:manage permission retrieves timelogs
  const timelogViewConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  const viewResult = await api.functional.hrmTracker.member.timelogs.index(
    timelogViewConnection,
    {
      body: {
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        page: 1,
        limit: 100,
      } satisfies IHrmTrackerTimelog.IRequest,
    },
  );
  typia.assert(viewResult);
  // 7. Validate results
  TestValidator.equals(
    "returned timelog count",
    viewResult.data.length,
    testTimelogs.length,
  );
  TestValidator.predicate(
    "has valid pagination",
    viewResult.pagination.pages >= 1,
  );
  // 8. Test data isolation with separate member
  const otherMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  const otherConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: otherMember.token.access },
  };
  const isolatedViewResult =
    await api.functional.hrmTracker.member.timelogs.index(otherConnection, {
      body: {
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        page: 1,
        limit: 100,
      } satisfies IHrmTrackerTimelog.IRequest,
    });
  typia.assert(isolatedViewResult);
  // Verify data isolation
  TestValidator.predicate(
    "data isolation - different org context",
    isolatedViewResult.data.length === 0,
  );
}
