import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_paginated_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {}, // utility function handles random generation
  });
  // 2. Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create multiple departments for pagination testing
  const createdDepartments: IErpHrmDepartment[] = [];
  const departmentNames = [
    "Engineering",
    "Sales",
    "Marketing",
    "Human Resources",
    "Finance",
    "Operations",
    "Customer Support",
  ];
  for (const name of departmentNames) {
    const department = await generate_random_erp_hrm_member_departments_create(
      memberConnection,
      {
        body: {
          name,
          description: `Description for ${name}`,
        },
      },
    );
    typia.assert(department);
    createdDepartments.push(department);
  }
  const totalRecords = createdDepartments.length;
  TestValidator.equals("created department count", totalRecords, 7);
  // 4. Test paginated retrieval - first page
  const page1 = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        limit: 3,
        page: 1,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 has 3 items", page1.data.length, 3);
  TestValidator.equals("page1 current page", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 3);
  TestValidator.equals(
    "page1 total records",
    page1.pagination.records,
    totalRecords,
  );
  // 5. Test paginated retrieval - second page
  const page2 = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        limit: 3,
        page: 2,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 has 3 items", page2.data.length, 3);
  TestValidator.equals("page2 current page", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page1 and page2 IDs differ",
    page1.data[0].id,
    page2.data[0].id,
  );
  const allPageIds = [...page1.data, ...page2.data].map((d) => d.id);
  const uniqueIds = new Set(allPageIds);
  TestValidator.predicate(
    "no duplicate IDs across pages",
    uniqueIds.size === allPageIds.length,
  );
  // 6. Test paginated retrieval - third page (partial)
  const page3 = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        limit: 3,
        page: 3,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page3 has 1 item", page3.data.length, 1);
  TestValidator.equals(
    "page3 total records consistent",
    page3.pagination.records,
    totalRecords,
  );
  // 7. Test page beyond available items
  const pageEmpty = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        limit: 10,
        page: 100,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(pageEmpty);
  TestValidator.equals("empty page has 0 items", pageEmpty.data.length, 0);
  TestValidator.equals(
    "empty page total records consistent",
    pageEmpty.pagination.records,
    totalRecords,
  );
  // 8. Verify created items exist in results
  const foundIds = new Set(
    [...page1.data, ...page2.data, ...page3.data].map((d) => d.id),
  );
  const createdIds = new Set(createdDepartments.map((d) => d.id));
  TestValidator.equals(
    "all created items found in paginated results",
    foundIds.size,
    createdIds.size,
  );
}
