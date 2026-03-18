import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_list_filter_by_name_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and create isolated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // 3. Create two custom roles
  const financeManagerRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Finance Manager",
          permissions: ["employee:view"],
        },
        params: { organizationId },
      },
    );
  typia.assert(financeManagerRole);
  const salesRepRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Sales Representative",
          permissions: ["project:view"],
        },
        params: { organizationId },
      },
    );
  typia.assert(salesRepRole);
  // 4. Filter with name: 'man' — should match 'Finance Manager' and built-in 'Manager'
  const manFilter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: { name: "man" } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(manFilter);
  const manNames = manFilter.data.map((r) => r.name);
  // Finance Manager must be included
  TestValidator.predicate(
    "Finance Manager is in results for 'man'",
    manNames.some((n) => n === "Finance Manager"),
  );
  // built-in Manager must be included
  TestValidator.predicate(
    "built-in Manager is in results for 'man'",
    manNames.some((n) => n.toLowerCase().includes("manager")),
  );
  // Sales Representative must NOT be included
  TestValidator.predicate(
    "Sales Representative is NOT in results for 'man'",
    !manNames.some((n) => n === "Sales Representative"),
  );
  // Owner must NOT be included
  TestValidator.predicate(
    "Owner is NOT in results for 'man'",
    !manNames.some((n) => n === "Owner"),
  );
  // Employee must NOT be included
  TestValidator.predicate(
    "Employee is NOT in results for 'man'",
    !manNames.some((n) => n === "Employee"),
  );
  // 5. Filter with name: 'Representative' — should match only 'Sales Representative'
  const repFilter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: { name: "Representative" } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(repFilter);
  const repNames = repFilter.data.map((r) => r.name);
  TestValidator.predicate(
    "Sales Representative is in results for 'Representative'",
    repNames.some((n) => n === "Sales Representative"),
  );
  TestValidator.predicate(
    "Finance Manager is NOT in results for 'Representative'",
    !repNames.some((n) => n === "Finance Manager"),
  );
  // 6. Filter with nonexistent keyword — should return empty results
  const emptyFilter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: { name: "nonexistent_xyz_123" } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "empty result records is 0",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result data array length is 0",
    emptyFilter.data.length,
    0,
  );
  // 7. Verify alphabetical sort for 'man' filter
  const sortedFilter =
    await api.functional.erpHrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "man",
          sort_by: "name",
          sort_order: "asc",
        } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(sortedFilter);
  const sortedNames = sortedFilter.data.map((r) => r.name);
  const manuallySorted = [...sortedNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "roles are sorted alphabetically ascending by name",
    sortedNames,
    manuallySorted,
  );
  // 8. Multi-tenancy isolation: second member + org should not see first org's roles
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    member2Connection,
    {},
  );
  typia.assert(org2);
  const org2Filter =
    await api.functional.erpHrm.member.organizations.roles.index(
      member2Connection,
      {
        organizationId: org2.id,
        body: { name: "Finance Manager" } satisfies IErpHrmRole.IRequest,
      },
    );
  typia.assert(org2Filter);
  const org2Names = org2Filter.data.map((r) => r.name);
  TestValidator.predicate(
    "Finance Manager from org1 does NOT appear in org2 role list",
    !org2Names.some((n) => n === "Finance Manager"),
  );
}
