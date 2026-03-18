import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_department_update_nested_parent_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and set up actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create top-level 'Engineering' department (will be the grandparent)
  const engineering =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(engineering);
  // 4. Create child 'Backend' department with 'Engineering' as parent
  const backend =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Backend",
          parentId: engineering.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(backend);
  // 5. Create top-level 'Frontend' department (target for the update test)
  const frontend =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Frontend",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(frontend);
  // Negative case: Attempt to set 'Backend' (a child/sub-department) as the parent of 'Frontend'
  // This should fail with 422 because 'Backend' already has a parent ('Engineering')
  await TestValidator.error(
    "assigning sub-department as parent should fail",
    async () => {
      await api.functional.erpHrm.member.organizations.departments.update(
        memberConnection,
        {
          organizationId: organization.id,
          departmentId: frontend.id,
          body: {
            name: "Frontend",
            parentId: backend.id,
          } satisfies IErpHrmDepartment.IUpdate,
        },
      );
    },
  );
  // Positive case: Assign 'Engineering' (a top-level department) as the parent of 'Frontend'
  // This should succeed because 'Engineering' has no parent itself
  const updated =
    await api.functional.erpHrm.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: frontend.id,
        body: {
          name: "Frontend",
          parentId: engineering.id,
        } satisfies IErpHrmDepartment.IUpdate,
      },
    );
  typia.assert(updated);
  // Verify the returned department has the correct parent
  TestValidator.predicate(
    "updated department has engineering as parent",
    updated.parent !== null && updated.parent.id === engineering.id,
  );
}
