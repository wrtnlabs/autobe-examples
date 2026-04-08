import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_contract_filtering_by_date_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and create organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Register member with known password
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: memberPassword,
    },
  });
  // 4. Login admin to get proper session
  await authorize_admin_login(adminConnection, {
    body: {
      email: member.email,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 5. Create member employee - need to get a role from the organization
  // First login as admin with the admin account
  const adminLoginConn: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConn, {
    body: {
      email: (adminConnection as any).email ?? "admin@test.com",
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 6. Create a new member to be the employee
  const employeeMemberConn: api.IConnection = { host: connection.host };
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeMember = await authorize_member_join(employeeMemberConn, {
    body: {
      password: employeePassword,
    },
  });
  // 7. Create employee using the new member's email
  // Note: We need a roleId - in a real scenario, we'd query roles first
  // For this test, we'll create the employee using the admin connection
  const employeeData = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: employeeMember.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  // If it's an invitation, we need to handle differently
  const employeeId =
    (employeeData as any).employee?.id ?? (employeeData as any).id ?? "";
  // 8. Define date ranges for contracts
  const now = new Date();
  const pastDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const pastEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureEndDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  // 9. Create contracts with different start dates and statuses
  // Contract 1: Past start, no end date (active)
  const contractActive1 =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDate: pastDate.toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contractActive1);
  // Contract 2: Past start, past end date (ended)
  const contractEnded =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDate: pastDate.toISOString(),
          endDate: pastEndDate.toISOString(),
          payRate: 4500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contractEnded);
  // Contract 3: Past start, future end date (ongoing)
  const contractOngoing =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDate: pastDate.toISOString(),
          endDate: futureEndDate.toISOString(),
          payRate: 5500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contractOngoing);
  // Contract 4: Recent start, no end date (active)
  const contractActive2 =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDate: recentDate.toISOString(),
          payRate: 6000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contractActive2);
  // Contract 5: Future start, no end date (active)
  const contractFuture =
    await api.functional.erpHrm.admin.employees.contracts.create(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDate: futureDate.toISOString(),
          payRate: 6500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contractFuture);
  // 10. Test startDateFrom filter - get contracts starting from recent date
  const filterByStartDateFrom =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDateFrom: recentDate.toISOString(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(filterByStartDateFrom);
  // Verify only contracts with start_date >= recentDate are returned
  for (const contract of filterByStartDateFrom.data) {
    const contractStartDate = new Date(contract.startDate);
    TestValidator.predicate(
      "contract start_date >= filter date",
      contractStartDate >= recentDate,
    );
  }
  // 11. Test status filter - 'active' (no end_date)
  const filterByStatusActive =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "active",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(filterByStatusActive);
  // Verify all returned contracts have no end_date (active)
  for (const contract of filterByStatusActive.data) {
    TestValidator.equals(
      "active contract has no end_date",
      contract.endDate,
      null,
    );
  }
  // 12. Test status filter - 'ended'
  const filterByStatusEnded =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "ended",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(filterByStatusEnded);
  // Verify all returned contracts have end_date in the past
  for (const contract of filterByStatusEnded.data) {
    if (contract.endDate !== null && contract.endDate !== undefined) {
      const endDate = new Date(contract.endDate);
      TestValidator.predicate(
        "ended contract has past end_date",
        endDate < now,
      );
    }
  }
  // 13. Test status filter - 'ongoing'
  const filterByStatusOngoing =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          status: "ongoing",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(filterByStatusOngoing);
  // Verify all returned contracts have end_date in the future
  for (const contract of filterByStatusOngoing.data) {
    if (contract.endDate !== null && contract.endDate !== undefined) {
      const endDate = new Date(contract.endDate);
      TestValidator.predicate(
        "ongoing contract has future end_date",
        endDate > now,
      );
    }
  }
  // 14. Test combined filters - startDateFrom AND status
  const combinedFilters =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          startDateFrom: pastDate.toISOString(),
          status: "active",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Verify combined filters are applied
  for (const contract of combinedFilters.data) {
    const contractStartDate = new Date(contract.startDate);
    TestValidator.predicate(
      "contract start_date >= filter date",
      contractStartDate >= pastDate,
    );
    TestValidator.equals(
      "contract is active (no end_date)",
      contract.endDate,
      null,
    );
  }
  // 15. Test payPeriod filter
  const filterByPayPeriod =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {
          payPeriod: "monthly",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(filterByPayPeriod);
  // Verify all returned contracts have monthly pay period
  for (const contract of filterByPayPeriod.data) {
    TestValidator.equals(
      "contract pay_period is monthly",
      contract.payPeriod,
      "monthly",
    );
  }
  // 16. Verify descending order by start_date
  const allContracts =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {} satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(allContracts);
  // Verify results are in descending order by start_date
  for (let i = 0; i < allContracts.data.length - 1; i++) {
    const currentStartDate = new Date(allContracts.data[i].startDate);
    const nextStartDate = new Date(allContracts.data[i + 1].startDate);
    TestValidator.predicate(
      "contracts in descending order by start_date",
      currentStartDate >= nextStartDate,
    );
  }
}