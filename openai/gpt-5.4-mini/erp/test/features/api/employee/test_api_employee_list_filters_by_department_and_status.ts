import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_hrm_time_tracking_member_departments_create";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_department } from "../../../prepare/prepare_random_hrm_time_tracking_department";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_list_filters_by_department_and_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authorized.token.access,
  };
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphaNumeric(8)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const departmentA =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-a-${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(departmentA);
  const departmentB =
    await generate_random_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-b-${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(departmentB);
  const userAccountId1 = typia.random<string & tags.Format<"uuid">>();
  const userAccountId2 = typia.random<string & tags.Format<"uuid">>();
  const userAccountId3 = typia.random<string & tags.Format<"uuid">>();
  const fullTimeStatus = "active";
  const inactiveStatus = "inactive";
  const contractorType = "contractor";
  const fullTimeType = "full-time";
  const employee1 =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: userAccountId1,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: departmentA.id,
          positionTitle: `Engineer ${RandomGenerator.alphaNumeric(4)}`,
          employmentType: fullTimeType,
          status: fullTimeStatus,
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee1);
  const employee2 =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: userAccountId2,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: departmentB.id,
          positionTitle: `Analyst ${RandomGenerator.alphaNumeric(4)}`,
          employmentType: contractorType,
          status: fullTimeStatus,
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee2);
  const employee3 =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: userAccountId3,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          departmentId: departmentA.id,
          positionTitle: `Support ${RandomGenerator.alphaNumeric(4)}`,
          employmentType: fullTimeType,
          status: inactiveStatus,
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee3);
  const pageAll = await api.functional.hrmTimeTracking.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(pageAll);
  TestValidator.predicate(
    "all employees belong to the active organization",
    pageAll.data.every((item) => item.organization.id === organization.id),
  );
  const departmentFiltered =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          department_id: departmentA.id,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(departmentFiltered);
  TestValidator.predicate(
    "department filter returns only matching department employees",
    departmentFiltered.data.every(
      (item) => item.department?.id === departmentA.id,
    ),
  );
  const combinedFiltered =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          department_id: departmentA.id,
          employment_type: fullTimeType,
          status: fullTimeStatus,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filters match all requested constraints",
    combinedFiltered.data.every(
      (item) =>
        item.department?.id === departmentA.id &&
        item.employmentType === fullTimeType &&
        item.status === fullTimeStatus,
    ),
  );
  TestValidator.equals(
    "combined filter should return the expected employee",
    combinedFiltered.data.map((item) => item.id).sort(),
    [employee1.id].sort(),
  );
  const emptyFiltered =
    await api.functional.hrmTimeTracking.member.employees.index(
      memberConnection,
      {
        body: {
          department_id: departmentB.id,
          employment_type: fullTimeType,
          status: inactiveStatus,
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingEmployee.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  TestValidator.equals(
    "non-matching filter combination returns no data",
    emptyFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "empty result page count",
    emptyFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result page current",
    emptyFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result page limit",
    emptyFiltered.pagination.limit,
    100,
  );
  TestValidator.equals(
    "empty result page pages",
    emptyFiltered.pagination.pages,
    0,
  );
}
