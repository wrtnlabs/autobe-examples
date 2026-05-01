import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Verify that the contract listing endpoint returns all non-deleted contracts
 * across the organization with correct default behavior.
 *
 * Validates the default contract browsing experience for organization members,
 * ensuring that the paginated listing correctly reflects created contracts with
 * proper field inclusion, status flags, and default sort ordering. The test
 * also verifies pagination boundary correctness by explicitly providing page
 * and limit parameters.
 *
 * 1. Member joins the platform to establish authentication and organization context.
 * 2. A custom role is created for the test employee.
 * 3. An employee is created with the custom role and full-time employment type.
 * 4. An ongoing employment contract is created with monthly pay period, pay rate of
 *    5000, and 40 working hours per week, with no end date.
 * 5. The contract index endpoint is called without filters, verifying pagination
 *    metadata, contract data inclusion, is_active flag being true, end_date being
 *    null, and compensation field values matching the input.
 * 6. A second call with explicit page=1 and limit=10 validates pagination boundary
 *    values match the expected parameters and total record count.
 */
export async function test_api_contract_list_default_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to establish authentication and organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee with the custom role and full-time employment type
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create an ongoing employment contract with specific compensation terms
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          pay_rate: 5000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          end_date: null,
        },
      },
    );
  typia.assert(contract);
  // 5. Default listing with no filters
  const result = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(result);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    1,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    result.pagination.pages >= 1,
  );
  // Verify the created contract appears in the listing with correct values
  const foundContract = result.data.find((c) => c.id === contract.id);
  TestValidator.predicate(
    "contract exists in listing",
    foundContract !== undefined,
  );
  if (foundContract !== undefined) {
    TestValidator.equals("contract pay_rate", foundContract.pay_rate, 5000);
    TestValidator.equals(
      "contract pay_period",
      foundContract.pay_period,
      "monthly",
    );
    TestValidator.equals(
      "contract working_hours_per_week",
      foundContract.working_hours_per_week,
      40,
    );
    TestValidator.equals(
      "contract start_date",
      foundContract.start_date,
      contract.start_date,
    );
    TestValidator.equals(
      "contract is ongoing with no end_date",
      foundContract.end_date,
      null,
    );
    TestValidator.predicate(
      "contract is_active is true",
      foundContract.is_active === true,
    );
  }
  // 6. Pagination boundary test with explicit page and limit
  const pagedResult = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination current is 1",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    pagedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records matches total",
    pagedResult.pagination.records,
    result.pagination.records,
  );
}
