import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test department listing with hierarchical parent-child relationships.
 *
 * Validates the complete department listing workflow including member authentication, organization creation, and department hierarchy management. Ensures that the department list endpoint correctly returns all departments with proper parent-child relationships and pagination metadata.
 *
 * Special attention is given to verifying that the parentDepartment field is correctly populated for child departments and null for top-level departments, enabling proper organizational structure visualization.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization with currency, timezone, and fiscal settings.
 * 3. Create two top-level departments (Engineering, Marketing) with no parent.
 * 4. Create child departments under Engineering (Backend, Frontend) to test hierarchy.
 * 5. Call department list endpoint to retrieve all departments.
 * 6. Validates all departments are returned with correct parentDepartment references.
 * 7. Validates pagination metadata includes correct total count and page information.
 * 8. Validates departments are sorted by name ascending by default.
 */
export async function test_api_department_list_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create top-level departments (no parent)
  const engineeringDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Engineering",
          description: "Engineering department",
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(engineeringDept);
  const marketingDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Marketing",
          description: "Marketing department",
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(marketingDept);
  // 4. Create child departments under Engineering
  const backendDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Backend Team",
          description: "Backend development team",
          parentDepartmentId: engineeringDept.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(backendDept);
  const frontendDept =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "Frontend Team",
          description: "Frontend development team",
          parentDepartmentId: engineeringDept.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(frontendDept);
  // 5. List all departments
  const departmentList =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 10,
          sort: "name",
          order: "asc",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(departmentList);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "total records count",
    departmentList.pagination.records,
    4,
  );
  TestValidator.equals("current page", departmentList.pagination.current, 1);
  TestValidator.predicate(
    "pages calculated",
    departmentList.pagination.pages >= 1,
  );
  // 7. Validate all departments are returned
  TestValidator.equals("department count", departmentList.data.length, 4);
  // 8. Validate hierarchical structure
  const engineeringData = departmentList.data.find(
    (d) => d.name === "Engineering",
  );
  TestValidator.predicate("Engineering exists", engineeringData !== undefined);
  const safeEngineering = typia.assert(engineeringData!);
  TestValidator.equals(
    "Engineering has no parent",
    safeEngineering.parentDepartment,
    null,
  );
  const marketingData = departmentList.data.find((d) => d.name === "Marketing");
  TestValidator.predicate("Marketing exists", marketingData !== undefined);
  const safeMarketing = typia.assert(marketingData!);
  TestValidator.equals(
    "Marketing has no parent",
    safeMarketing.parentDepartment,
    null,
  );
  const backendData = departmentList.data.find(
    (d) => d.name === "Backend Team",
  );
  TestValidator.predicate("Backend exists", backendData !== undefined);
  const safeBackend = typia.assert(backendData!);
  typia.assertGuard(safeBackend.parentDepartment!);
  TestValidator.equals(
    "Backend parent is Engineering",
    safeBackend.parentDepartment.id,
    safeEngineering.id,
  );
  TestValidator.equals(
    "Backend parent name",
    safeBackend.parentDepartment.name,
    "Engineering",
  );
  const frontendData = departmentList.data.find(
    (d) => d.name === "Frontend Team",
  );
  TestValidator.predicate("Frontend exists", frontendData !== undefined);
  const safeFrontend = typia.assert(frontendData!);
  typia.assertGuard(safeFrontend.parentDepartment!);
  TestValidator.equals(
    "Frontend parent is Engineering",
    safeFrontend.parentDepartment.id,
    safeEngineering.id,
  );
  TestValidator.equals(
    "Frontend parent name",
    safeFrontend.parentDepartment.name,
    "Engineering",
  );
  // 9. Validate sorting by name ascending
  const names = departmentList.data.map((d) => d.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "departments sorted by name ascending",
    names,
    sortedNames,
  );
}