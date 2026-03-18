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
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (the joining member becomes Owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create top-level parent department 'Engineering'
  const engineering =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Engineering",
          description: "Engineering department",
          parentId: null,
        },
      },
    );
  typia.assert(engineering);
  // Step 4: Create child department 'Frontend' under 'Engineering'
  const frontend =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Frontend",
          description: "Frontend team",
          parentId: engineering.id,
        },
      },
    );
  typia.assert(frontend);
  // Step 5: Create another top-level department 'Marketing'
  const marketing =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Marketing",
          description: "Marketing department",
          parentId: null,
        },
      },
    );
  typia.assert(marketing);
  // Step 6: Retrieve department list with default pagination (empty body)
  const page =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {} satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(page);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination.records equals 3",
    page.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination.current equals 1",
    page.pagination.current,
    1,
  );
  TestValidator.equals("pagination.limit equals 20", page.pagination.limit, 20);
  TestValidator.equals("pagination.pages equals 1", page.pagination.pages, 1);
  // Validate data array contains 3 departments
  TestValidator.equals("data array length equals 3", page.data.length, 3);
  // Find each department in the response data
  const engineeringInPage = page.data.find((d) => d.id === engineering.id);
  const frontendInPage = page.data.find((d) => d.id === frontend.id);
  const marketingInPage = page.data.find((d) => d.id === marketing.id);
  TestValidator.predicate(
    "Engineering is in page data",
    engineeringInPage !== undefined,
  );
  TestValidator.predicate(
    "Frontend is in page data",
    frontendInPage !== undefined,
  );
  TestValidator.predicate(
    "Marketing is in page data",
    marketingInPage !== undefined,
  );
  // Validate hierarchy: Engineering has no parent (top-level)
  TestValidator.equals(
    "Engineering parent is null",
    engineeringInPage!.parent,
    null,
  );
  // Validate hierarchy: Marketing has no parent (top-level)
  TestValidator.equals(
    "Marketing parent is null",
    marketingInPage!.parent,
    null,
  );
  // Validate hierarchy: Frontend has Engineering as parent
  TestValidator.predicate(
    "Frontend parent is not null",
    frontendInPage!.parent !== null,
  );
  TestValidator.equals(
    "Frontend parent id matches Engineering id",
    frontendInPage!.parent!.id,
    engineering.id,
  );
}
