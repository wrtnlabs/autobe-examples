import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test department listing with hierarchical structure verification.
 *
 * This test validates the department listing endpoint by:
 * 1. Authenticating as admin
 * 2. Retrieving paginated department list
 * 3. Verifying response structure and hierarchy representation
 * 4. Ensuring soft-deleted departments are excluded
 * 5. Validating organization context isolation
 */
export async function test_api_department_list_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Request department list with default parameters
  const response = await api.functional.hrmPlatform.admin.departments.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  // 3. Validate response structure (complete type validation)
  typia.assert(response);
  // 4. Validate pagination metadata (business logic)
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate department data array is not empty
  TestValidator.predicate(
    "department list is not empty",
    response.data.length > 0,
  );
  // 6. Validate business logic for each department
  await ArrayUtil.asyncForEach(response.data, async (department, index) => {
    // Validate soft-delete exclusion (deleted_at should be null for active departments)
    TestValidator.equals(
      `department[${index}] is not soft-deleted`,
      department.deleted_at,
      null,
    );
  });
  // 7. Verify organization context isolation
  // All departments should belong to the same organization
  const firstOrgId = response.data[0]?.organization.id;
  TestValidator.predicate(
    "all departments belong to same organization",
    response.data.every((dept) => dept.organization.id === firstOrgId),
  );
  // 8. Verify hierarchy representation exists
  const hasParent = response.data.some((dept) => dept.parent !== null);
  const hasTopLevel = response.data.some((dept) => dept.parent === null);
  TestValidator.predicate(
    "department hierarchy includes top-level departments",
    hasTopLevel,
  );
  // Note: hasParent may be false if no child departments exist yet, which is valid
}
