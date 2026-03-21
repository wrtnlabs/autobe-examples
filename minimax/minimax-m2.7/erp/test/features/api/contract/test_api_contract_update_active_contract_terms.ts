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

/**
 * Test updating an active employment contract with new compensation terms.
 *
 * Steps:
 * 1. Admin joins the system to obtain authentication token
 * 2. Create a new employee within the organization context
 * 3. Create an initial contract for the employee with valid terms
 * 4. Verify the contract is created and active
 * 5. Send PUT request to update the contract with new values
 * 6. Validate response returns HTTP 200 with updated contract
 * 7. Verify the contract data reflects all changes
 */
export async function test_api_contract_update_active_contract_terms(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the system to obtain authentication token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2 & 3: Create employee and initial contract using the generation utility
  // The utility handles employee-contract creation flow properly
  const initialContract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: 5000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(initialContract);
  // Step 4: Verify the contract is created and active
  TestValidator.equals("initial pay_rate", initialContract.pay_rate, 5000);
  TestValidator.equals(
    "initial pay_period",
    initialContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "initial working_hours",
    initialContract.working_hours_per_week,
    40,
  );
  TestValidator.predicate("contract has employee", !!initialContract.employee);
  TestValidator.predicate(
    "contract has valid id",
    initialContract.id.length > 0,
  );
  // Step 5: Send PUT request to update the contract with new values
  const updatedContract =
    await api.functional.erpHrm.admin.employees.contracts.update(
      adminConnection,
      {
        employeeId: initialContract.employee.id,
        contractId: initialContract.id,
        body: {
          pay_rate: 6000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Updated compensation package",
        } satisfies IErpHrmContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // Step 6 & 7: Validate response with updated contract data
  TestValidator.equals(
    "updated pay_rate to 6000",
    updatedContract.pay_rate,
    6000,
  );
  TestValidator.equals(
    "updated pay_period preserved",
    updatedContract.pay_period,
    "monthly",
  );
  TestValidator.equals(
    "updated working_hours preserved",
    updatedContract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "updated notes match",
    updatedContract.notes,
    "Updated compensation package",
  );
  TestValidator.equals(
    "contract id unchanged",
    updatedContract.id,
    initialContract.id,
  );
  TestValidator.equals(
    "employee association preserved",
    updatedContract.employee.id,
    initialContract.employee.id,
  );
  TestValidator.equals(
    "start_date preserved",
    updatedContract.start_date,
    initialContract.start_date,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedContract.updated_at).getTime() >=
      new Date(initialContract.created_at).getTime(),
  );
}
