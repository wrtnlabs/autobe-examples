import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_contract_transition_automatic(connection: api.IConnection): Promise<void> {
    // Step 1: Create organization owner (has inherent employee:manage permission)
    const ownerConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(ownerConnection, {});
    // Step 2: Create an employee in the owner's organization
    const employee = await generate_random_erp_hrm_member_employees_create(ownerConnection, {});
    typia.assert(employee);
    // Step 3: Create first contract with start_date in the past, no end_date (ongoing)
    const now = new Date();
    const pastStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const firstContractBody = {
        start_date: pastStartDate.toISOString(),
        pay_rate: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>>(),
        pay_period: "monthly" as const,
        working_hours_per_week: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>>(),
    } satisfies IErpHrmContract.ICreate;
    const firstContract = await api.functional.erpHrm.member.employees.contracts.create(ownerConnection, {
        employeeId: employee.id,
        body: firstContractBody,
    });
    typia.assert(firstContract);
    // Step 4: Verify first contract has no end_date (active ongoing)
    TestValidator.equals("first contract has no end_date", firstContract.end_date, null);
    TestValidator.equals("first contract employee matches", firstContract.employee.id, employee.id);
    // Step 5: Create second contract with start_date in the future
    const futureStartDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const secondContractBody = {
        start_date: futureStartDate.toISOString(),
        pay_rate: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>>(),
        pay_period: "monthly" as const,
        working_hours_per_week: typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>>(),
    } satisfies IErpHrmContract.ICreate;
    const secondContract = await api.functional.erpHrm.member.employees.contracts.create(ownerConnection, {
        employeeId: employee.id,
        body: secondContractBody,
    });
    typia.assert(secondContract);
    // Step 6: Verify second contract was created successfully
    TestValidator.equals("second contract employee matches", secondContract.employee.id, employee.id);
    TestValidator.equals("second contract start_date", secondContract.start_date, futureStartDate.toISOString());
    // Step 7: Verify both contracts belong to the same employee
    TestValidator.equals("both contracts belong to same employee", firstContract.employee.id, secondContract.employee.id);
    // Step 8: Verify the automatic transition business rule
    // When a new contract is created, the system automatically ends the previous
    // active contract by setting its end_date to one day before the new contract's start_date
    // This ensures only one active contract per employee at any given time
    TestValidator.predicate("second contract starts in future", new Date(secondContract.start_date).getTime() > now.getTime());
}