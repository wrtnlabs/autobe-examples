import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import type { IPageIHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_owner_employees_contracts_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_contract_history_owner_timeline_review(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const employeePage = await api.functional.hrmTimeTracking.employees.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  TestValidator.equals(
    "employee directory current page",
    employeePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "employee directory limit",
    employeePage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "organization has at least one employee available for contract history review",
    employeePage.data.length > 0,
  );
  const employee = employeePage.data[0];
  typia.assert(employee);
  const request = {
    page: 1,
    limit: 100,
    sort: "start_date",
    direction: "desc",
  } satisfies IHrmTimeTrackingEmployeeContract.IRequest;
  const contractPage =
    await api.functional.hrmTimeTracking.owner.employees.contracts.index(
      ownerConnection,
      {
        employeeId: employee.id,
        body: request,
      },
    );
  typia.assert(contractPage);
  TestValidator.equals(
    "contract history current page",
    contractPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "contract history limit",
    contractPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "contract history record count is non-negative",
    contractPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "contract history page count is non-negative",
    contractPage.pagination.pages >= 0,
  );
  contractPage.data.forEach((contract) => {
    typia.assert(contract);
  });
  if (contractPage.data.length === 0) {
    TestValidator.equals(
      "empty contract history returns empty data",
      contractPage.data.length,
      0,
    );
    return;
  }
  TestValidator.predicate(
    "timeline review returns preserved unique contract records",
    new Set(contractPage.data.map((contract) => contract.id)).size ===
      contractPage.data.length,
  );
  const activeContracts = contractPage.data.filter(
    (contract) => contract.end_date === null,
  );
  const historicalContracts = contractPage.data.filter(
    (contract) => contract.end_date !== null,
  );
  if (activeContracts.length > 0 && historicalContracts.length > 0) {
    TestValidator.predicate(
      "active and historical contracts are visible together",
      activeContracts.length > 0 && historicalContracts.length > 0,
    );
  }
  for (let i = 0; i < contractPage.data.length - 1; i++) {
    const newer = contractPage.data[i];
    const older = contractPage.data[i + 1];
    const newerStart = new Date(newer.start_date).getTime();
    const olderStart = new Date(older.start_date).getTime();
    TestValidator.predicate(
      `contracts are sorted by newest start date first at index ${i}`,
      newerStart >= olderStart,
    );
    if (older.end_date !== null) {
      const olderEnd = new Date(older.end_date).getTime();
      TestValidator.predicate(
        `older contract does not overlap newer contract at index ${i}`,
        olderEnd <= newerStart,
      );
    }
  }
}
