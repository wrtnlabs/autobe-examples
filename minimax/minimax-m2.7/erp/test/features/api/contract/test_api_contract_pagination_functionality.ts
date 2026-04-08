import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_contract_pagination_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and get credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 4. Create employee with member email and Owner role
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: memberAuth.email,
        roleId: organization.owner.id,
        employmentType: "full-time",
      },
    },
  );
  // 5. Create multiple contracts (12 contracts to test pagination with limit=5)
  const numContracts = 12;
  for (let i = 0; i < numContracts; i++) {
    const startDate = new Date(2024, 0, i + 1);
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: startDate.toISOString(),
          endDate: i % 3 === 0 ? null : new Date(2024, 0, i + 31).toISOString(),
          payPeriod: "monthly",
          payRate: 5000 + i * 100,
          workingHoursPerWeek: 40,
        },
      },
    );
  }
  // 6. Get first page with limit=5
  const firstPage = await api.functional.erpHrm.admin.employees.contracts.index(
    adminConnection,
    {
      employeeId: employee.id,
      body: {
        limit: 5,
        page: 1,
      },
    },
  );
  typia.assert(firstPage);
  // 7. Verify first page contains up to 5 contracts
  TestValidator.equals("first page count", firstPage.data.length, 5);
  // 8. Verify pagination metadata for first page
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 5", firstPage.pagination.limit, 5);
  TestValidator.equals("total records is 12", firstPage.pagination.records, 12);
  TestValidator.equals("total pages is 3", firstPage.pagination.pages, 3);
  // 9. Verify contracts are sorted by startDate descending
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].startDate).getTime();
    const next = new Date(firstPage.data[i + 1].startDate).getTime();
    TestValidator.predicate(
      `contract ${i} startDate >= contract ${i + 1} startDate`,
      current >= next,
    );
  }
  // 10. Get second page
  const secondPage =
    await api.functional.erpHrm.admin.employees.contracts.index(
      adminConnection,
      {
        employeeId: employee.id,
        body: {
          limit: 5,
          page: 2,
        },
      },
    );
  typia.assert(secondPage);
  // 11. Verify second page contains next 5 contracts
  TestValidator.equals("second page count", secondPage.data.length, 5);
  // 12. Verify second page pagination metadata
  TestValidator.equals("current page is 2", secondPage.pagination.current, 2);
  TestValidator.equals(
    "total records still 12",
    secondPage.pagination.records,
    12,
  );
  // 13. Get non-existent page (page=999)
  const emptyPage = await api.functional.erpHrm.admin.employees.contracts.index(
    adminConnection,
    {
      employeeId: employee.id,
      body: {
        limit: 5,
        page: 999,
      },
    },
  );
  typia.assert(emptyPage);
  // 14. Verify empty data array for non-existent page
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
  // 15. Verify pagination metadata still reflects total record count
  TestValidator.equals(
    "total records still 12 on empty page",
    emptyPage.pagination.records,
    12,
  );
  TestValidator.equals(
    "pages still 3 on empty page",
    emptyPage.pagination.pages,
    3,
  );
}
