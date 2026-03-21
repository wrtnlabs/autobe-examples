import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";

export async function test_api_contract_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get employees to find an employeeId
  const employeesPage: IPageIErpHrmEmployee.ISummary =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        status: "active",
        limit: 1,
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(employeesPage);
  // Get employeeId from first employee or create one if none exist
  let employeeId: string;
  if (employeesPage.data.length > 0) {
    employeeId = employeesPage.data[0].id;
  } else {
    throw new Error("No employees found. Please create an employee first.");
  }
  // 3. Create an ongoing contract (no endDate)
  const ongoingContract =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          start_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: null,
          pay_rate: 5000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(ongoingContract);
  TestValidator.equals(
    "ongoing contract has null end_date",
    ongoingContract.end_date,
    null,
  );
  // 4. Create an ended contract (with endDate)
  const endedContract =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          start_date: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          pay_rate: 4500,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(endedContract);
  TestValidator.equals(
    "ended contract has non-null end_date",
    endedContract.end_date !== null,
    true,
  );
  // 5. Filter contracts by status='ongoing'
  const ongoingContractsPage: IPageIErpHrmContract.ISummary =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "ongoing",
        },
      },
    );
  typia.assert(ongoingContractsPage);
  // Verify only contracts with null end_date are returned
  const ongoingContractIds = ongoingContractsPage.data.map((c) => c.id);
  TestValidator.equals(
    "ongoing contract found in 'ongoing' filter",
    ongoingContractIds.includes(ongoingContract.id),
    true,
  );
  TestValidator.equals(
    "ended contract NOT found in 'ongoing' filter",
    ongoingContractIds.includes(endedContract.id),
    false,
  );
  // Verify all returned contracts have null endDate
  for (const contract of ongoingContractsPage.data) {
    TestValidator.equals("contract has null endDate", contract.endDate, null);
  }
  // 6. Filter contracts by status='ended'
  const endedContractsPage: IPageIErpHrmContract.ISummary =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "ended",
        },
      },
    );
  typia.assert(endedContractsPage);
  // Verify only contracts with non-null end_date are returned
  const endedContractIds = endedContractsPage.data.map((c) => c.id);
  TestValidator.equals(
    "ended contract found in 'ended' filter",
    endedContractIds.includes(endedContract.id),
    true,
  );
  TestValidator.equals(
    "ongoing contract NOT found in 'ended' filter",
    endedContractIds.includes(ongoingContract.id),
    false,
  );
  // Verify all returned contracts have non-null endDate
  for (const contract of endedContractsPage.data) {
    TestValidator.predicate(
      "contract has non-null endDate",
      contract.endDate !== null,
    );
  }
  // 7. Filter contracts by status='active' (should behave like 'ongoing')
  const activeContractsPage: IPageIErpHrmContract.ISummary =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeContractsPage);
  // Verify 'active' behaves the same as 'ongoing'
  const activeContractIds = activeContractsPage.data.map((c) => c.id);
  TestValidator.equals(
    "ongoing contract found in 'active' filter",
    activeContractIds.includes(ongoingContract.id),
    true,
  );
  TestValidator.equals(
    "ended contract NOT found in 'active' filter",
    activeContractIds.includes(endedContract.id),
    false,
  );
}
