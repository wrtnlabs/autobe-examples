import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_department_hierarchy_child_becomes_root(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  // Admin join creates admin account and associated organization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Admin creates parent department "Sales" (root-level)
  const parentDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Sales",
        description: "Sales department",
        parentId: null,
      },
    });
  typia.assert(parentDepartment);
  // 3. Admin creates child department "Sales-Team" under "Sales"
  const childDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Sales-Team",
        description: "Sales team subgroup",
        parentId: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // 4. Verify hierarchy before deletion - child should be under parent
  const hierarchyBefore =
    await api.functional.erpHrm.member.departments.hierarchy(adminConnection);
  typia.assert(hierarchyBefore);
  // Find parent department in hierarchy
  const parentInHierarchyBefore = [hierarchyBefore].find(
    (dept) => dept.name === "Sales",
  );
  TestValidator.equals(
    "parent department exists before deletion",
    parentInHierarchyBefore !== undefined,
    true,
  );
  if (parentInHierarchyBefore) {
    TestValidator.equals(
      "parent has child before deletion",
      parentInHierarchyBefore.children.length > 0,
      true,
    );
    const childUnderParent = parentInHierarchyBefore.children.find(
      (child) => child.name === "Sales-Team",
    );
    TestValidator.equals(
      "child is nested under parent",
      childUnderParent !== undefined,
      true,
    );
  }
  // 5. Admin deletes the parent department
  // This should orphan the child, making it a root-level department
  await api.functional.erpHrm.admin.departments.erase(adminConnection, {
    departmentId: parentDepartment.id,
  });
  // 6. Retrieve department hierarchy after parent deletion
  const hierarchyAfter =
    await api.functional.erpHrm.member.departments.hierarchy(adminConnection);
  typia.assert(hierarchyAfter);
  // 7. Validate business logic:
  // - The child department "Sales-Team" should now be at root level (parent: null)
  // - The child department should have no children of its own (empty array)
  // Find the child department in the hierarchy (should be at root level now)
  const childInHierarchyAfter = [hierarchyAfter].find(
    (dept) => dept.name === "Sales-Team",
  );
  TestValidator.equals(
    "child department exists in hierarchy after deletion",
    childInHierarchyAfter !== undefined,
    true,
  );
  if (childInHierarchyAfter) {
    TestValidator.equals(
      "child department parent is null after orphaning",
      childInHierarchyAfter.parent,
      null,
    );
    TestValidator.equals(
      "child department has no children array",
      childInHierarchyAfter.children.length,
      0,
    );
  }
}
