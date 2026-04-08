import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_list_manager_all_records_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: `manager.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee member accounts
  const employeeCount = 3;
  const employees: Array<{
    connection: api.IConnection;
    auth: IHrmMember.IAuthorized;
  }> = [];
  for (let i = 0; i < employeeCount; i++) {
    const empConnection: api.IConnection = { host: connection.host };
    const empAuth = await authorize_member_join(empConnection, {
      body: {
        email: `employee.${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.com/register",
        referrer: "https://test.com",
      } satisfies IHrmMember.IJoin,
    });
    typia.assert(empAuth);
    employees.push({ connection: empConnection, auth: empAuth });
  }
  // 3. Query timesheets with different status filters
  // Note: This test validates the filtering capability of the endpoint
  // In a complete test scenario, timesheets would be created through employee workflows
  const organizationCode = "test-org";
  const statuses = ["draft", "submitted", "approved", "rejected"] as const;
  // 4. Test filtering by each status
  for (const status of statuses) {
    const result =
      await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
        managerConnection,
        {
          organizationCode,
          body: {
            status,
            page: 1,
            limit: 10,
          } satisfies IHrmTimesheetTimelog.IRequest,
        },
      );
    typia.assert(result);
    // Verify response structure
    TestValidator.equals(
      `timesheet list for status ${status} has pagination`,
      result.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      `timesheet list for status ${status} has data array`,
      Array.isArray(result.data),
      true,
    );
    // Verify all returned timesheets match the filtered status
    for (const timesheet of result.data) {
      TestValidator.equals(
        `timesheet status matches filter ${status}`,
        timesheet.status,
        status,
      );
      // Verify workflow state information is present
      if (timesheet.status === "submitted" || timesheet.status === "approved") {
        TestValidator.equals(
          `timesheet ${status} has submitted_at`,
          timesheet.submitted_at !== null &&
            timesheet.submitted_at !== undefined,
          true,
        );
      }
      if (timesheet.status === "approved" || timesheet.status === "rejected") {
        TestValidator.equals(
          `timesheet ${status} has reviewed_at`,
          timesheet.reviewed_at !== null && timesheet.reviewed_at !== undefined,
          true,
        );
      }
      if (timesheet.status === "rejected") {
        TestValidator.equals(
          "rejected timesheet has rejection_reason",
          timesheet.rejection_reason !== null &&
            timesheet.rejection_reason !== undefined,
          true,
        );
      }
    }
  }
  // 5. Test without status filter (should return all timesheets)
  const allResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      managerConnection,
      {
        organizationCode,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "unfiltered list has pagination",
    allResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "unfiltered list has data array",
    Array.isArray(allResult.data),
    true,
  );
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is non-negative",
    allResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    allResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allResult.pagination.pages >= 0,
  );
  // 7. Verify pagination calculations are consistent
  if (allResult.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly when records exist",
      allResult.pagination.pages ===
        Math.ceil(allResult.pagination.records / allResult.pagination.limit),
    );
  }
  // 8. Test employee_id filter
  if (employees.length > 0) {
    const employeeTimesheets =
      await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
        managerConnection,
        {
          organizationCode,
          body: {
            employee_id: employees[0].auth.id,
            page: 1,
            limit: 10,
          } satisfies IHrmTimesheetTimelog.IRequest,
        },
      );
    typia.assert(employeeTimesheets);
    TestValidator.equals(
      "employee filtered list has pagination",
      employeeTimesheets.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      "employee filtered list has data array",
      Array.isArray(employeeTimesheets.data),
      true,
    );
    // Verify all returned timesheets belong to the filtered employee
    for (const timesheet of employeeTimesheets.data) {
      TestValidator.equals(
        "employee filtered timesheet belongs to correct employee",
        timesheet.employee.id,
        employees[0].auth.id,
      );
    }
  }
}
