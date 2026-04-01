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

export async function test_api_employee_directory_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const department =
    await generate_random_erp_hrm_time_member_departments_create(
      memberConnection,
      {
        body: {
          name: `Dept ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(department);
  const baseRequest = {
    departmentId: department.id,
    employmentType: "full-time",
    status: "active",
    sort: "+name",
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeEmployee.IRequest;
  const firstPage = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    { body: baseRequest },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page should match the request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match the request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "same request should return deterministic results",
    firstPage,
    await api.functional.erpHrmTime.member.employees.index(memberConnection, {
      body: baseRequest,
    }),
  );
  const searchRequest = {
    search: RandomGenerator.alphabets(4).toUpperCase(),
    departmentId: department.id,
    employmentType: "full-time",
    status: "active",
    sort: "+name",
    page: 1,
    limit: 5,
  } satisfies IErpHrmTimeEmployee.IRequest;
  const searched = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    { body: searchRequest },
  );
  typia.assert(searched);
  TestValidator.equals(
    "search page should honor the request page",
    searched.pagination.current,
    1,
  );
  TestValidator.equals(
    "search page should honor the request limit",
    searched.pagination.limit,
    5,
  );
  const beyondPage = await api.functional.erpHrmTime.member.employees.index(
    memberConnection,
    {
      body: {
        page: searched.pagination.pages + 100,
        limit: 5,
        departmentId: department.id,
      } satisfies IErpHrmTimeEmployee.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals(
    "out-of-range page should echo the requested page",
    beyondPage.pagination.current,
    searched.pagination.pages + 100,
  );
  TestValidator.equals(
    "out-of-range page should echo the requested limit",
    beyondPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "out-of-range page should return no rows",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range page should preserve total records",
    beyondPage.pagination.records,
    searched.pagination.records,
  );
}
