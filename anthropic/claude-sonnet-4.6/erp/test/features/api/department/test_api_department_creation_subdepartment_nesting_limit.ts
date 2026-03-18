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

export async function test_api_department_creation_subdepartment_nesting_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create top-level parent department 'Operations' (no parentId)
  const operationsDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Operations",
          description: "Top-level operations department",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(operationsDept);
  // Step 4: Create child department 'Logistics' with parentId = Operations UUID
  const logisticsDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Logistics",
          description: "Handles logistics within Operations",
          parentId: operationsDept.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(logisticsDept);
  // Step 5: Assert response for Logistics department
  TestValidator.equals("logistics name", logisticsDept.name, "Logistics");
  TestValidator.predicate(
    "logistics parent is not null",
    logisticsDept.parent !== null,
  );
  TestValidator.equals(
    "logistics parent id matches operations",
    logisticsDept.parent!.id,
    operationsDept.id,
  );
  TestValidator.equals(
    "logistics parent name is Operations",
    logisticsDept.parent!.name,
    "Operations",
  );
  TestValidator.equals(
    "operations parent.parent is null",
    logisticsDept.parent!.parent,
    null,
  );
  TestValidator.equals(
    "logistics children is empty",
    logisticsDept.children.length,
    0,
  );
  TestValidator.equals(
    "logistics deleted_at is null",
    logisticsDept.deleted_at,
    null,
  );
  // Step 6: Attempt to violate the one-level nesting rule
  // Try to create a department with parentId = Logistics.id (already a child dept)
  // Expect HTTP 422 Unprocessable Entity
  await TestValidator.httpError(
    "cannot nest a child department as parent",
    422,
    async () => {
      await generate_random_erp_hrm_member_organizations_departments_create(
        memberConnection,
        {
          body: {
            name: "SubLogistics",
            description: "Attempting to nest under a child department",
            parentId: logisticsDept.id,
          },
          params: {
            organizationId: organization.id,
          },
        },
      );
    },
  );
}
