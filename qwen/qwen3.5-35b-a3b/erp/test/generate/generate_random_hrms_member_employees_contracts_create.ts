import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { prepare_random_hrms_employee_contract } from "../prepare/prepare_random_hrms_employee_contract";
export async function generate_random_hrms_member_employees_contracts_create(connection: api.IConnection, props: {
    body?: DeepPartial<IHrmsEmployeeContract.ICreate> | undefined;
    params?: {
        employeeId: string;
    };
}): Promise<IHrmsEmployeeContract> {
    const prepared: IHrmsEmployeeContract.ICreate = prepare_random_hrms_employee_contract(props.body);
    const result: IHrmsEmployeeContract = await api.functional.hrms.member.employees.contracts.create(connection, {
        body: prepared,
        employeeId: props.params?.employeeId ?? crypto.randomUUID(),
    });
    return result;
}