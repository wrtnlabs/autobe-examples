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
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test hierarchical filtering capability of department listing endpoint.
 *
 * This test verifies that the department listing API correctly filters departments
 * based on parent_id parameter to retrieve specific hierarchy levels.
 *
 * Test scenarios:
 * 1. Filter by parent_id (UUID) - returns only direct children
 * 2. Filter for top-level departments (parentId = null)
 * 3. No parent filter - returns all departments
 */
export async function test_api_department_filter_by_parent_hierarchy(
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
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create test departments
  // Create a parent department (Engineering)
  const parentDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Engineering",
          description: "Engineering department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // Create another top-level department (Sales)
  const topLevelDepartment =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Sales",
          description: "Sales department",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(topLevelDepartment);
  // Create child departments under Engineering
  const childDepartment1 =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Backend Team",
          description: "Backend development team",
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment1);
  const childDepartment2 =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Frontend Team",
          description: "Frontend development team",
          parent_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment2);
  // Create a child department under Sales
  const childDepartment3 =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: {
          name: "Inside Sales",
          description: "Inside sales team",
          parent_id: topLevelDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment3);
  // 3. Test filtering by parent_id (UUID) - should return only children of Engineering
  const filteredByParent =
    await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
      body: {
        parentId: parentDepartment.id,
      } satisfies IHrmPlatformDepartment.IRequest,
    });
  typia.assert(filteredByParent);
  TestValidator.equals(
    "filter by parent_id returns only direct children",
    filteredByParent.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned departments are children of Engineering",
    filteredByParent.data.every(
      (dept) => dept.parent?.id === parentDepartment.id,
    ),
  );
  TestValidator.predicate(
    "no top-level departments in filtered results",
    filteredByParent.data.every((dept) => dept.parent !== null),
  );
  // 4. Test filtering for top-level departments (parentId = null)
  const filteredTopLevel =
    await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
      body: {
        parentId: null,
      } satisfies IHrmPlatformDepartment.IRequest,
    });
  typia.assert(filteredTopLevel);
  TestValidator.equals(
    "filter by parentId=null returns only top-level departments",
    filteredTopLevel.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned departments have no parent",
    filteredTopLevel.data.every((dept) => dept.parent === null),
  );
  TestValidator.predicate(
    "Engineering and Sales are in top-level results",
    filteredTopLevel.data.some((dept) => dept.id === parentDepartment.id) &&
      filteredTopLevel.data.some((dept) => dept.id === topLevelDepartment.id),
  );
  // 5. Test no parent filter - should return all departments
  const allDepartments =
    await api.functional.hrmPlatform.admin.departments.index(adminConnection, {
      body: {} satisfies IHrmPlatformDepartment.IRequest,
    });
  typia.assert(allDepartments);
  TestValidator.equals(
    "no filter returns all departments",
    allDepartments.data.length,
    5,
  );
  TestValidator.predicate(
    "all created departments are present",
    allDepartments.data.some((dept) => dept.id === parentDepartment.id) &&
      allDepartments.data.some((dept) => dept.id === topLevelDepartment.id) &&
      allDepartments.data.some((dept) => dept.id === childDepartment1.id) &&
      allDepartments.data.some((dept) => dept.id === childDepartment2.id) &&
      allDepartments.data.some((dept) => dept.id === childDepartment3.id),
  );
  // 6. Verify hierarchy structure
  TestValidator.predicate(
    "child departments reference correct parent",
    childDepartment1.parent?.id === parentDepartment.id &&
      childDepartment2.parent?.id === parentDepartment.id &&
      childDepartment3.parent?.id === topLevelDepartment.id,
  );
  // 7. Verify top-level departments have no parent
  TestValidator.equals(
    "parent department has no parent",
    parentDepartment.parent,
    null,
  );
  TestValidator.equals(
    "top-level department has no parent",
    topLevelDepartment.parent,
    null,
  );
}
