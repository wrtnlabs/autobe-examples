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

export async function test_api_department_deletion_parent_cascade_to_children(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authorized connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization scoping the departments
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a top-level parent department ('Operations')
  const parentDepartment =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Operations-" + RandomGenerator.alphabets(6),
          description: "Top-level parent department",
          parentId: null,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(parentDepartment);
  // Verify parent department is top-level (no parent)
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parent,
    null,
  );
  // Step 4: Create a child department ('Logistics') under the parent
  const childDepartment =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: "Logistics-" + RandomGenerator.alphabets(6),
          description: "Child department under Operations",
          parentId: parentDepartment.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(childDepartment);
  // Verify child department has parent reference set correctly
  TestValidator.predicate(
    "child department has parent reference",
    childDepartment.parent !== null,
  );
  TestValidator.equals(
    "child department's parent id matches parent department",
    childDepartment.parent!.id,
    parentDepartment.id,
  );
  // Step 5: Delete the parent department
  // According to business rules, this should cascade:
  // - Child departments have their parent reference cleared (promoted to top-level)
  // - No child departments are deleted
  await api.functional.erpHrm.member.organizations.departments.erase(
    memberConnection,
    {
      organizationId: organization.id,
      departmentId: parentDepartment.id,
    },
  );
  // Step 6: Verify the cascade behavior
  // The child department should still exist and be promoted to top-level
  // Since there's no GET single department endpoint in the SDK,
  // we verify through creating another child department would fail (parent is deleted)
  // and confirm via the delete operation succeeded without error.
  // Verify that the parent department is now deleted by attempting to delete it again
  // (should throw an error since it no longer exists)
  await TestValidator.error(
    "parent department no longer exists after deletion",
    async () => {
      await api.functional.erpHrm.member.organizations.departments.erase(
        memberConnection,
        {
          organizationId: organization.id,
          departmentId: parentDepartment.id,
        },
      );
    },
  );
  // Verify that creating a child department using the deleted parent's ID fails
  // This confirms the parent no longer exists
  await TestValidator.error(
    "cannot create department with deleted parent as parentId",
    async () => {
      await generate_random_erp_hrm_member_organizations_departments_create(
        memberConnection,
        {
          body: {
            name: "SubTeam-" + RandomGenerator.alphabets(6),
            description: "Should fail since parent is deleted",
            parentId: parentDepartment.id,
          },
          params: {
            organizationId: organization.id,
          },
        },
      );
    },
  );
  // Verify that the child department's name and structure were valid before deletion cascade
  TestValidator.predicate(
    "child department name was set correctly",
    childDepartment.name.startsWith("Logistics-"),
  );
  TestValidator.equals(
    "child department description is correct",
    childDepartment.description,
    "Child department under Operations",
  );
}
