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

export async function test_api_contract_filtering_by_date_range_and_pay_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Get an employee ID from the employees list
  const employeesPage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeesPage);
  // If no employees exist, we need to skip or handle this case
  // For this test, we'll assume employees exist or create minimal setup
  if (employeesPage.data.length === 0) {
    // Create a basic employee through some means if needed
    // For now, we validate that employee list has data
    TestValidator.predicate("employees exist", employeesPage.data.length > 0);
    return;
  }
  const employeeId = employeesPage.data[0]!.id;
  // 3. Create multiple contracts with different dates and pay periods
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  // Contract 1: Hourly, started 2 months ago, ended 1 month ago
  const contract1 =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          start_date: twoMonthsAgo.toISOString(),
          end_date: oneMonthAgo.toISOString(),
          pay_rate: 25.5,
          pay_period: "hourly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract1);
  // Contract 2: Monthly, started 1 month ago, ongoing (no end date)
  const contract2 =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          start_date: oneMonthAgo.toISOString(),
          end_date: null,
          pay_rate: 5000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract2);
  // Contract 3: Daily, started today, ends 1 month later
  const contract3 =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          start_date: now.toISOString(),
          end_date: oneMonthLater.toISOString(),
          pay_rate: 200,
          pay_period: "daily",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract3);
  // Contract 4: Weekly, started 2 months ago, ongoing
  const contract4 =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          start_date: twoMonthsAgo.toISOString(),
          end_date: null,
          pay_rate: 1500,
          pay_period: "weekly",
          working_hours_per_week: 20,
        },
      },
    );
  typia.assert(contract4);
  // 4. Filter by start date range (contracts started in last month)
  const startDateFiltered =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          startDateFrom: oneMonthAgo.toISOString(),
          startDateTo: now.toISOString(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(startDateFiltered);
  // Verify only contracts within the start date range are returned
  for (const contract of startDateFiltered.data) {
    const startDate = new Date(contract.startDate);
    TestValidator.predicate(
      "start date within range",
      startDate >= oneMonthAgo && startDate <= now,
    );
  }
  // 5. Filter by end date range (contracts that ended)
  const endDateFiltered =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          endDateFrom: twoMonthsAgo.toISOString(),
          endDateTo: now.toISOString(),
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(endDateFiltered);
  // Verify contracts have end dates within range or ongoing contracts handled correctly
  for (const contract of endDateFiltered.data) {
    if (contract.endDate !== null && contract.endDate !== undefined) {
      const endDate = new Date(contract.endDate);
      TestValidator.predicate(
        "end date within range",
        endDate >= twoMonthsAgo && endDate <= now,
      );
    }
  }
  // 6. Filter by payPeriod='hourly'
  const hourlyFiltered =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          payPeriod: "hourly",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(hourlyFiltered);
  // Verify all returned contracts are hourly
  for (const contract of hourlyFiltered.data) {
    TestValidator.equals("pay period is hourly", contract.payPeriod, "hourly");
  }
  // 7. Filter by payPeriod='monthly'
  const monthlyFiltered =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          payPeriod: "monthly",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(monthlyFiltered);
  // Verify all returned contracts are monthly
  for (const contract of monthlyFiltered.data) {
    TestValidator.equals(
      "pay period is monthly",
      contract.payPeriod,
      "monthly",
    );
  }
  // 8. Combined filters: date range AND payPeriod
  const combinedFiltered =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          startDateFrom: twoMonthsAgo.toISOString(),
          startDateTo: now.toISOString(),
          payPeriod: "monthly",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Verify combined filters work correctly
  for (const contract of combinedFiltered.data) {
    const startDate = new Date(contract.startDate);
    TestValidator.predicate(
      "start date within range",
      startDate >= twoMonthsAgo && startDate <= now,
    );
    TestValidator.equals(
      "pay period is monthly",
      contract.payPeriod,
      "monthly",
    );
  }
  // 9. Test status filter: ongoing (end_date IS NULL)
  const ongoingContracts =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          status: "ongoing",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(ongoingContracts);
  // Verify all returned contracts have null end_date
  for (const contract of ongoingContracts.data) {
    TestValidator.equals(
      "end date is null for ongoing",
      contract.endDate,
      null,
    );
  }
  // 10. Test status filter: ended (end_date IS NOT NULL)
  const endedContracts =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId,
        body: {
          status: "ended",
        } satisfies IErpHrmContract.IRequest,
      },
    );
  typia.assert(endedContracts);
  // Verify all returned contracts have non-null end_date
  for (const contract of endedContracts.data) {
    TestValidator.predicate(
      "end date is not null for ended",
      contract.endDate !== null && contract.endDate !== undefined,
    );
  }
}
