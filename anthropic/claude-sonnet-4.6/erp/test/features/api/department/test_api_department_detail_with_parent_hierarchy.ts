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

export async function test_api_department_detail_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create the parent (top-level) department named 'Operations'
  const parentDepartment =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Operations",
          description: null,
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(parentDepartment);
  // Step 4: Create the child department named 'Logistics' with parentId set
  const childDepartment =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Logistics",
          description: null,
          parentId: parentDepartment.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(childDepartment);
  // Step 5: Retrieve the child department via GET endpoint
  const retrievedChild =
    await api.functional.erpHrm.member.organizations.departments.at(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: childDepartment.id,
      },
    );
  typia.assert(retrievedChild);
  // Validate child department properties
  TestValidator.equals(
    "child department id",
    retrievedChild.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "child department name",
    retrievedChild.name,
    "Logistics",
  );
  TestValidator.equals(
    "child department deleted_at",
    retrievedChild.deleted_at,
    null,
  );
  TestValidator.equals(
    "child department organization id",
    retrievedChild.organization.id,
    organization.id,
  );
  // Validate parent reference exists and is correct
  TestValidator.predicate(
    "child has parent reference",
    retrievedChild.parent !== null,
  );
  TestValidator.equals(
    "child parent id",
    retrievedChild.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parent name",
    retrievedChild.parent!.name,
    "Operations",
  );
  TestValidator.equals(
    "child parent's parent is null (top-level)",
    retrievedChild.parent!.parent,
    null,
  );
  // Validate children is empty (no further nesting)
  TestValidator.equals(
    "child department has no children",
    retrievedChild.children.length,
    0,
  );
  // Step 6: Retrieve the parent department and validate its children include the child
  const retrievedParent =
    await api.functional.erpHrm.member.organizations.departments.at(
      memberConnection,
      {
        organizationId: organization.id,
        departmentId: parentDepartment.id,
      },
    );
  typia.assert(retrievedParent);
  // Validate parent department properties
  TestValidator.equals(
    "parent department id",
    retrievedParent.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent department name",
    retrievedParent.name,
    "Operations",
  );
  TestValidator.equals(
    "parent department parent is null (top-level)",
    retrievedParent.parent,
    null,
  );
  // Validate parent's children includes the child department
  TestValidator.predicate(
    "parent children includes child department",
    retrievedParent.children.some((child) => child.id === childDepartment.id),
  );
}
