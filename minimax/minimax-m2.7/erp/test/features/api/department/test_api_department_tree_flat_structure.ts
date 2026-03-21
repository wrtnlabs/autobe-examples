import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving department tree when the organization has multiple departments
 * with no parent-child relationships (flat structure).
 *
 * 1. Authenticate as a member via POST /erpHrm/auth/member/join
 * 2. Call GET /erpHrm/member/departments/tree
 * 3. Validate response is an array at the root level
 * 4. Verify all departments are sorted alphabetically by name
 * 5. Each department node should have id, name, description, and children array
 * 6. Departments are returned regardless of their active/inactive status
 */
export async function test_api_department_tree_flat_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Retrieve department tree
  const tree =
    await api.functional.erpHrm.member.departments.tree(memberConnection);
  typia.assert(tree);
  // 3. Validate response is an object (single root ITree)
  // Note: Based on the API response type, it returns IErpHrmDepartment.ITree directly
  // The tree structure itself represents the departments
  // 4. If there are departments, validate structure
  const departments = tree.children;
  // 5. Validate each department node has required properties
  for (const dept of departments) {
    TestValidator.predicate(
      "department has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        dept.id,
      ),
    );
    TestValidator.predicate("department has name", dept.name.length > 0);
    TestValidator.equals(
      "description is null or string",
      typeof dept.description === "string" || dept.description === null,
      true,
    );
    TestValidator.predicate("children is array", Array.isArray(dept.children));
    // In a flat structure, all departments should have empty children arrays
    TestValidator.equals(
      "flat structure - no children",
      dept.children.length,
      0,
    );
  }
  // 6. Verify alphabetical sorting by name
  if (departments.length > 1) {
    for (let i = 0; i < departments.length - 1; i++) {
      const current = departments[i].name.toLowerCase();
      const next = departments[i + 1].name.toLowerCase();
      TestValidator.predicate(
        `alphabetical sort: "${current}" should come before "${next}"`,
        current <= next,
      );
    }
  }
}
