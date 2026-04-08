import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_list_organization_scoped_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@example.com` as string,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!` as string,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const output = await api.functional.erpHrmTime.member.employees.index(
    employeeConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IErpHrmTimeEmployeeDashboardSummary.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page should be at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length should not exceed pagination limit",
    output.data.length <= output.pagination.limit,
  );
  const expectedPages =
    output.pagination.records === 0
      ? 0
      : Math.ceil(output.pagination.records / output.pagination.limit);
  TestValidator.equals(
    "pagination pages should match records divided by limit",
    output.pagination.pages,
    expectedPages,
  );
  for (const employee of output.data) {
    typia.assert(employee);
    TestValidator.predicate(
      "employee row should include an organization summary",
      employee.organization.id.length > 0,
    );
    TestValidator.predicate(
      "employee row should include a member summary",
      employee.member !== null,
    );
    TestValidator.predicate(
      "employee row should include a role summary",
      employee.role.id.length > 0,
    );
    TestValidator.predicate(
      "employee row should have a createdAt timestamp",
      employee.createdAt.length > 0,
    );
    TestValidator.predicate(
      "employee row should have an updatedAt timestamp",
      employee.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "employee row status should be present",
      employee.status.length > 0,
    );
    TestValidator.predicate(
      "employee row employment type should be present",
      employee.employmentType.length > 0,
    );
  }
}
