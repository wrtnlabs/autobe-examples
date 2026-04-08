import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin to create organization and departments
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.erpHrm.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await api.functional.erpHrm.auth.admin.login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create test departments - some with "Engineer" in name, some without
  const nonMatchingDepts = await Promise.all([
    generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: { name: "Human Resources" },
    }),
    generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: { name: "Marketing" },
    }),
  ]);
  typia.assert(nonMatchingDepts);
  const engineerDept1 = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: { name: `${RandomGenerator.paragraph({ sentences: 1 })} Engineer` },
    },
  );
  typia.assert(engineerDept1);
  const engineerDept2 = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: { name: `${RandomGenerator.paragraph({ sentences: 1 })} Engineer` },
    },
  );
  typia.assert(engineerDept2);
  // 4. Register and login as member to access member endpoints
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 5. Search departments by name containing "Engineer"
  const searchResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: { search: "Engineer" } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(searchResult);
  // 6. Validate only matching departments are returned
  TestValidator.equals(
    "returns only matching departments",
    searchResult.data.length,
    2,
  );
  // 7. Validate all returned departments contain "Engineer"
  TestValidator.predicate("all results contain Engineer", () =>
    searchResult.data.every((d) => d.name.toLowerCase().includes("engineer")),
  );
  // 8. Validate non-matching departments are excluded
  TestValidator.predicate(
    "excludes non-matching departments",
    () =>
      !searchResult.data.some(
        (d) => d.name === "Human Resources" || d.name === "Marketing",
      ),
  );
  // 9. Validate pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records matches filtered count",
    searchResult.pagination.records,
    2,
  );
}
