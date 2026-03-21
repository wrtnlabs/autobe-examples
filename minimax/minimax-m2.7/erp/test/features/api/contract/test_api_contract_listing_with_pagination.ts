import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_contract_listing_with_pagination(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as admin to obtain valid JWT tokens
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

    // 2. Query employee list to find a valid employeeId
    const employeePage = await api.functional.erpHrm.admin.employees.index(adminConnection, {
        body: {
            page: 1,
            limit: 10,
        } satisfies IErpHrmEmployee.IRequest,
    });
    typia.assert(employeePage);

    // Get a valid employeeId (use first employee if available)
    const targetEmployee = employeePage.data[0];
    if (!targetEmployee) {
        // If no employees exist, the test cannot proceed
        // This is expected in a fresh system
        return;
    }
    const employeeId = targetEmployee.id;

    // 3. Call contract listing with pagination
    const contractPage = await api.functional.erpHrm.admin.employees.contracts.index(adminConnection, {
        employeeId: employeeId,
        body: {
            page: 1,
            limit: 10,
        } satisfies IErpHrmContract.IRequest,
    });
    typia.assert(contractPage);

    // 4. Verify response contains pagination metadata
    TestValidator.equals("has pagination metadata", contractPage.pagination !== undefined, true);
    TestValidator.equals("current page is 1", contractPage.pagination.current, 1);
    TestValidator.equals("limit is 10", contractPage.pagination.limit, 10);
    TestValidator.predicate("records >= 0", contractPage.pagination.records >= 0);
    TestValidator.predicate("pages >= 0", contractPage.pagination.pages >= 0);

    // 5. Verify contracts are sorted by start_date in descending order (most recent first)
    if (contractPage.data.length > 1) {
        for (let i = 0; i < contractPage.data.length - 1; i++) {
            const current = new Date(contractPage.data[i].startDate).getTime();
            const next = new Date(contractPage.data[i + 1].startDate).getTime();
            TestValidator.predicate(`contract ${i} startDate >= contract ${i + 1} startDate`, current >= next);
        }
    }

    // 6. Verify each contract includes required fields
    for (let i = 0; i < contractPage.data.length; i++) {
        const contract = contractPage.data[i];
        TestValidator.predicate(`contract ${i} has id`, contract.id !== undefined && contract.id !== null);
        TestValidator.predicate(`contract ${i} has startDate`, contract.startDate !== undefined && contract.startDate !== null);
        TestValidator.predicate(`contract ${i} has payRate`, typeof contract.payRate === "number");
        TestValidator.predicate(`contract ${i} has payPeriod`, contract.payPeriod !== undefined && contract.payPeriod !== null);
        TestValidator.predicate(`contract ${i} has workingHoursPerWeek`, typeof contract.workingHoursPerWeek === "number");
        TestValidator.predicate(`contract ${i} has employee`, contract.employee !== undefined);

        // endDate can be null for ongoing contracts
        if (contract.endDate !== undefined && contract.endDate !== null) {
            TestValidator.predicate(`contract ${i} endDate is valid date`, !isNaN(new Date(contract.endDate).getTime()));
        }
    }

    // 7. Verify contracts belong to the specified employeeId
    for (let i = 0; i < contractPage.data.length; i++) {
        const contract = contractPage.data[i];
        if (contract.employee) {
            TestValidator.equals(`contract ${i} belongs to employee ${employeeId}`, contract.employee.id, employeeId);
        }
    }
}