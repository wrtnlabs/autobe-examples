import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";

export async function test_api_employee_directory_browse(
  connection: api.IConnection,
): Promise<void> {
  const ownerEmail1 = `${RandomGenerator.alphabets(8)}@test.com`;
  const ownerEmail2 = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "P@ssw0rd123!";
  const organizationOwner1: api.IConnection = { host: connection.host };
  const authorizedOwner1 = await authorize_member_join(organizationOwner1, {
    body: {
      email: ownerEmail1,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorizedOwner1);
  const orgConnection1: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedOwner1.token.access },
  };
  const organizationOwner2: api.IConnection = { host: connection.host };
  const authorizedOwner2 = await authorize_member_join(organizationOwner2, {
    body: {
      email: ownerEmail2,
      password,
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/signup",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorizedOwner2);
  const orgConnection2: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedOwner2.token.access },
  };
  const targetDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      orgConnection1,
      {
        body: {
          name: `Dept ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(targetDepartment);
  const otherDepartment =
    await generate_random_erp_hrm_time_member_departments_create(
      orgConnection2,
      {
        body: {
          name: `Dept ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(otherDepartment);
  const keyword = RandomGenerator.alphabets(6);
  const listRequest: IErpHrmTimeEmployee.IRequest = {
    search: keyword,
    departmentId: targetDepartment.id,
    status: "active",
    page: 1,
    limit: 5,
    sort: "+id",
  };
  const firstPage = await api.functional.erpHrmTime.member.employees.index(
    orgConnection1,
    {
      body: listRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "filter context preserved",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("page limit preserved", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page data is an array",
    Array.isArray(firstPage.data),
  );
  TestValidator.predicate("first page respects filter context", () =>
    firstPage.data.every(
      (employee) =>
        employee.department === null ||
        employee.department.id === targetDepartment.id,
    ),
  );
  const repeatedFirstPage =
    await api.functional.erpHrmTime.member.employees.index(orgConnection1, {
      body: listRequest,
    });
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "stable repeated query results",
    repeatedFirstPage,
    firstPage,
  );
  const secondPage = await api.functional.erpHrmTime.member.employees.index(
    orgConnection1,
    {
      body: {
        ...listRequest,
        page: 2,
      } satisfies IErpHrmTimeEmployee.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "same limit on next page",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.notEquals(
    "different page number",
    firstPage.pagination.current,
    secondPage.pagination.current,
  );
  TestValidator.equals(
    "same filters preserved across pages",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.predicate("second page stays in same organization scope", () =>
    secondPage.data.every(
      (employee) =>
        employee.department === null ||
        employee.department.id === targetDepartment.id,
    ),
  );
  const activeDepartmentResults =
    await api.functional.erpHrmTime.member.employees.index(orgConnection1, {
      body: {
        departmentId: targetDepartment.id,
        page: 1,
        limit: 10,
        sort: "+id",
      } satisfies IErpHrmTimeEmployee.IRequest,
    });
  typia.assert(activeDepartmentResults);
  TestValidator.predicate(
    "department filter returns only selected department employees",
    () =>
      activeDepartmentResults.data.every(
        (employee) =>
          employee.department !== null &&
          employee.department.id === targetDepartment.id,
      ),
  );
  const crossOrganizationResults =
    await api.functional.erpHrmTime.member.employees.index(orgConnection2, {
      body: {
        departmentId: otherDepartment.id,
        page: 1,
        limit: 10,
        sort: "+id",
      } satisfies IErpHrmTimeEmployee.IRequest,
    });
  typia.assert(crossOrganizationResults);
  TestValidator.predicate("cross organization results stay isolated", () =>
    crossOrganizationResults.data.every(
      (employee) =>
        employee.department !== null &&
        employee.department.id === otherDepartment.id,
    ),
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "permission boundary rejects unauthenticated caller",
    async () => {
      await api.functional.erpHrmTime.member.employees.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 5,
            sort: "+id",
          } satisfies IErpHrmTimeEmployee.IRequest,
        },
      );
    },
  );
}
