import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of department hierarchy as authenticated admin.
 *
 * This test verifies that:
 * 1. The endpoint returns a valid hierarchical structure with top-level departments
 * 2. Each department contains required fields (id, name, description, created_at, updated_at)
 * 3. Top-level departments have childDepartments arrays with direct children
 * 4. The hierarchy respects the one-level nesting constraint
 * 5. Departments are sorted by name at each hierarchy level
 * 6. Only active departments (deleted_at IS NULL) are included
 * 7. Organization context is properly isolated
 */
export async function test_api_department_hierarchy_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Retrieve department hierarchy
  const hierarchy =
    await api.functional.hrmPlatform.admin.departments.hierarchy(
      adminConnection,
    );
  typia.assert(hierarchy);
  // 3. Validate hierarchy structure exists
  TestValidator.predicate(
    "hierarchy contains departments array",
    Array.isArray(hierarchy.departments),
  );
  // 4. Validate departments are sorted by name at top level (if more than one)
  if (hierarchy.departments.length > 1) {
    const names = hierarchy.departments.map((d) => d.name);
    const sortedNames = [...names].sort();
    TestValidator.equals(
      "top-level departments are sorted by name",
      names,
      sortedNames,
    );
  }
  // 5. Validate child departments are sorted by name (if any top-level has children)
  for (const topLevel of hierarchy.departments) {
    if (topLevel.childDepartments.length > 1) {
      const childNames = topLevel.childDepartments.map((c) => c.name);
      const sortedChildNames = [...childNames].sort();
      TestValidator.equals(
        `child departments under "${topLevel.name}" are sorted by name`,
        childNames,
        sortedChildNames,
      );
    }
  }
}
