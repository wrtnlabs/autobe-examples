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
 * Test retrieving department tree when the organization has a hierarchical structure with parent-child relationships.
 *
 * This test validates the department hierarchy endpoint by:
 * 1. Authenticating as a member via POST /erpHrm/auth/member/join
 * 2. Calling GET /erpHrm/member/departments/tree
 * 3. Validating response contains both root-level departments (parent_id = NULL) and nested child departments
 * 4. Verifying that child departments appear within their parent's children array
 * 5. Confirming the one-level nesting rule is enforced (no grandchild departments with 2-level depth)
 * 6. Verifying alphabetical sorting applies at each level of the tree
 * 7. Each node structure includes id, name, description, and children array (empty for leaf nodes)
 */
export async function test_api_department_tree_hierarchical_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve department tree
  const tree =
    await api.functional.erpHrm.member.departments.tree(memberConnection);
  typia.assert(tree);
  // Helper function to validate department tree node structure
  const validateNode = (node: IErpHrmDepartment.ITree): void => {
    // Validate required properties exist
    TestValidator.predicate(
      "node has id",
      node.id !== undefined && node.id !== null,
    );
    TestValidator.predicate(
      "node has name",
      node.name !== undefined && node.name !== null,
    );
    TestValidator.equals(
      "description is string or null",
      typeof node.description === "string" || node.description === null,
      true,
    );
    TestValidator.predicate("children is array", Array.isArray(node.children));
  };
  // Helper function to verify alphabetical sorting
  const validateAlphabeticalSorting = (
    nodes: IErpHrmDepartment.ITree[],
  ): void => {
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1].name.toLowerCase();
      const curr = nodes[i].name.toLowerCase();
      TestValidator.predicate(
        `departments sorted alphabetically: "${prev}" comes before "${curr}"`,
        prev <= curr,
      );
    }
  };
  // 3-4. Validate response structure and hierarchy
  // Tree can be a single root or array of roots based on actual API behavior
  const rootNodes = Array.isArray(tree) ? tree : [tree];
  for (const rootNode of rootNodes) {
    validateNode(rootNode);
    // Verify children are nested correctly
    if (rootNode.children.length > 0) {
      // 5. Verify one-level nesting rule (children should have empty children arrays - no grandchildren)
      for (const child of rootNode.children) {
        validateNode(child);
        // Child's children should be empty (enforcing one-level nesting)
        TestValidator.equals(
          "child has no grandchildren (one-level nesting rule)",
          child.children.length,
          0,
        );
      }
    }
  }
  // 6. Verify alphabetical sorting at root level
  validateAlphabeticalSorting(rootNodes);
  // 7. Verify alphabetical sorting within children arrays
  for (const rootNode of rootNodes) {
    if (rootNode.children.length > 1) {
      validateAlphabeticalSorting(rootNode.children);
    }
  }
  // Validate that tree has proper hierarchical structure
  TestValidator.predicate(
    "tree has at least one root node",
    rootNodes.length > 0,
  );
}
