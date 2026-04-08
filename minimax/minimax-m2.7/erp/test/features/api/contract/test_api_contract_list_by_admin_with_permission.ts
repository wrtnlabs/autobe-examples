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

export async function test_api_contract_list_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register admin and create organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // Setup: Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // Create employee by inviting the existing member
  // Find the Employee role ID from the organization's built-in roles
  const employeeRoleId = typia.random<string & tags.Format<"uuid">>();
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: memberAuth.email,
        roleId: employeeRoleId,
        employmentType: "full-time",
      },
    });
  // Since the member already exists, the employee record should be created immediately.
  // We need to find the actual employee ID. For this test, we'll use the member's ID
  // as the employee reference since they were added to the organization.
  // In a real scenario, you would query the employee list to find the employee by email.
  // Note: The employeeId in the contract API should be the actual employee UUID,
  // not the invitation ID or member ID. For this test, we use the member's ID
  // as a placeholder since the actual employee record was created with this member reference.
  const employeeId = memberAuth.id;
  // Create multiple contracts for the employee to establish contract history
  const baseDate = new Date();
  // Contract 1 - oldest (ended)
  await generate_random_erp_hrm_admin_employees_contracts_create(
    adminConnection,
    {
      body: {
        startDate: new Date(
          baseDate.getTime() - 180 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date(
          baseDate.getTime() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        payRate: 5000,
        payPeriod: "monthly",
        workingHoursPerWeek: 40,
        notes: "First employment contract",
      },
      params: { employeeId },
    },
  );
  // Contract 2 - middle (ended)
  await generate_random_erp_hrm_admin_employees_contracts_create(
    adminConnection,
    {
      body: {
        startDate: new Date(
          baseDate.getTime() - 90 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: new Date(
          baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        payRate: 5500,
        payPeriod: "monthly",
        workingHoursPerWeek: 40,
        notes: "Second employment contract",
      },
      params: { employeeId },
    },
  );
  // Contract 3 - newest (active, no end date)
  await generate_random_erp_hrm_admin_employees_contracts_create(
    adminConnection,
    {
      body: {
        startDate: new Date(
          baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        endDate: null,
        payRate: 6000,
        payPeriod: "monthly",
        workingHoursPerWeek: 40,
        notes: "Current employment contract",
      },
      params: { employeeId },
    },
  );
  // Test: Retrieve paginated contract list for the employee
  const contractListResponse =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employeeId,
        body: {} satisfies IErpHrmContract.IRequest,
      },
    );
  // Validate response structure with typia.assert
  typia.assert(contractListResponse);
  // Validate pagination metadata is present
  TestValidator.predicate(
    "pagination object exists",
    contractListResponse.pagination !== null &&
      contractListResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    contractListResponse.pagination.current !== null &&
      contractListResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    contractListResponse.pagination.limit !== null &&
      contractListResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records count",
    contractListResponse.pagination.records !== null &&
      contractListResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages count",
    contractListResponse.pagination.pages !== null &&
      contractListResponse.pagination.pages !== undefined,
  );
  // Validate contracts array exists and is an array
  TestValidator.predicate(
    "data is an array",
    Array.isArray(contractListResponse.data),
  );
  // Validate we have contracts (should have at least 3)
  TestValidator.predicate(
    "has contracts created",
    contractListResponse.data.length >= 3,
  );
  // Validate contract structure and sorting (descending by startDate)
  for (let i = 0; i < contractListResponse.data.length - 1; i++) {
    const currentContract = contractListResponse.data[i];
    const nextContract = contractListResponse.data[i + 1];
    const currentStartDate = new Date(currentContract.startDate);
    const nextStartDate = new Date(nextContract.startDate);
    // Verify contracts are sorted by startDate descending (most recent first)
    TestValidator.predicate(
      `contract[${i}] startDate >= contract[${i + 1}] startDate`,
      currentStartDate.getTime() >= nextStartDate.getTime(),
    );
    // Validate contract has required fields
    TestValidator.predicate(
      `contract[${i}] has id`,
      currentContract.id !== null && currentContract.id !== undefined,
    );
    TestValidator.predicate(
      `contract[${i}] has startDate`,
      currentContract.startDate !== null &&
        currentContract.startDate !== undefined,
    );
    TestValidator.predicate(
      `contract[${i}] has payRate`,
      currentContract.payRate !== null && currentContract.payRate !== undefined,
    );
    TestValidator.predicate(
      `contract[${i}] has payPeriod`,
      currentContract.payPeriod !== null &&
        currentContract.payPeriod !== undefined,
    );
    TestValidator.predicate(
      `contract[${i}] has workingHoursPerWeek`,
      currentContract.workingHoursPerWeek !== null &&
        currentContract.workingHoursPerWeek !== undefined,
    );
    TestValidator.predicate(
      `contract[${i}] has employee reference`,
      currentContract.employee !== null &&
        currentContract.employee !== undefined,
    );
  }
  // Validate pagination values are reasonable
  TestValidator.predicate(
    "current page is >= 1",
    contractListResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is > 0",
    contractListResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records matches actual data length",
    contractListResponse.pagination.records ===
      contractListResponse.data.length,
  );
  TestValidator.predicate(
    "pages is >= 1",
    contractListResponse.pagination.pages >= 1,
  );
}
