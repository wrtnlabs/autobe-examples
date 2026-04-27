import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contracts_cross_employee_view(
  connection: api.IConnection,
): Promise<void> {
  // ---- Preconditions ----
  // 1. Register member A (org owner)
  const aEmail: string = typia.random<string & tags.Format<"email">>();
  const aPassword: string = RandomGenerator.alphaNumeric(16);
  const aConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(aConnection, {
    body: {
      email: aEmail,
      password: aPassword,
    },
  });
  typia.assert(memberA);
  // 2. Create organization — member A becomes employee A (owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      aConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register member B with known credentials
  const bEmail: string = typia.random<string & tags.Format<"email">>();
  const bPassword: string = RandomGenerator.alphaNumeric(16);
  const bConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(bConnection, {
    body: {
      email: bEmail,
      password: bPassword,
    },
  });
  typia.assert(memberB);
  // 4. Invite member B to the organization — auto-creates employee B
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      aConnection,
      {
        body: {
          email: bEmail,
        },
      },
    );
  typia.assert(invitation);
  // 5. Re-authenticate as B to get updated authorized response with employee ID
  const bRefreshedConnection: api.IConnection = { host: connection.host };
  const memberBRefreshed = await authorize_member_join(bRefreshedConnection, {
    body: {
      email: bEmail,
      password: bPassword,
    },
  });
  typia.assert(memberBRefreshed);
  // Get employee B's ID from the refreshed response
  const employeeB = memberBRefreshed.employees.find(
    (emp) => emp.member.email === bEmail,
  );
  if (employeeB === undefined)
    throw new Error("Employee B not found after invitation");
  // 6. Create a contract for employee B
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      aConnection,
      {
        params: {
          employeeId: employeeB.id,
        },
      },
    );
  typia.assert(contract);
  // ---- Test Step ----
  // As member A, call PATCH /employees/{employeeBId}/contracts to view B's contracts
  const contractPage =
    await api.functional.hrmTimeTracking.employees.contracts.index(
      aConnection,
      {
        employeeId: employeeB.id,
        body: {},
      },
    );
  typia.assert(contractPage);
  // ---- Validation ----
  TestValidator.equals(
    "contract page references employee B",
    contractPage.data[0]?.employee.id,
    employeeB.id,
  );
  TestValidator.predicate(
    "contract page contains at least one contract",
    contractPage.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination shows correct record count",
    contractPage.pagination.records >= 1,
  );
}
