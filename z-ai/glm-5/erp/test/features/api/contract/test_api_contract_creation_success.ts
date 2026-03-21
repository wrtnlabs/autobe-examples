import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_contract_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create manager (first member becomes organization owner with full permissions including employee:manage)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      avatarImage: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(manager);
  // Step 2: Create an employee using manager's connection (manager has employee:manage permission as owner)
  const employee = await api.functional.erpHrm.member.employees.create(
    managerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: RandomGenerator.pick([
          "full_time",
          "part_time",
          "contractor",
          "intern",
        ] as const),
      },
    },
  );
  typia.assert(employee);
  // Step 3: Create contract for the employee
  const contractBody = {
    start_date: new Date().toISOString(),
    pay_rate: typia.random<number>(),
    pay_period: RandomGenerator.pick([
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ] as const),
    working_hours_per_week: typia.random<number & tags.Type<"int32">>(),
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IErpHrmContract.ICreate;
  const contract =
    await api.functional.erpHrm.member.employees.contracts.create(
      managerConnection,
      {
        employeeId: employee.id,
        body: contractBody,
      },
    );
  typia.assert(contract);
  // Step 4: Validate contract response
  TestValidator.equals(
    "contract has ID",
    typeof contract.id === "string",
    true,
  );
  TestValidator.equals(
    "start_date matches",
    contract.start_date,
    contractBody.start_date,
  );
  TestValidator.equals(
    "pay_rate matches",
    contract.pay_rate,
    contractBody.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches",
    contract.pay_period,
    contractBody.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches",
    contract.working_hours_per_week,
    contractBody.working_hours_per_week,
  );
  TestValidator.equals(
    "notes matches",
    contract.notes,
    contractBody.notes ?? null,
  );
  TestValidator.equals(
    "employee ID matches",
    contract.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(contract.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(contract.updated_at) instanceof Date,
  );
}
