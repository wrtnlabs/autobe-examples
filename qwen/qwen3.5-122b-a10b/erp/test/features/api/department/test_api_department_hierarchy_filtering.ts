import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_hierarchy_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Generate organization ID for testing
  // Note: This test assumes the organization exists with pre-populated departments
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test filtering by parent_department_id with a specific UUID
  // This validates the filter parameter is correctly processed
  const parentDepartmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const filteredByParent =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: parentDepartmentId,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(filteredByParent);
  // Validate response structure
  TestValidator.predicate(
    "filtered response has pagination",
    filteredByParent.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered response has data array",
    Array.isArray(filteredByParent.data),
  );
  // If departments exist for this parent, validate parent relationship
  if (filteredByParent.data.length > 0) {
    for (const dept of filteredByParent.data) {
      TestValidator.equals(
        "department parent matches filter",
        dept.parent_department?.id,
        parentDepartmentId,
      );
    }
  }
  // 3. Test with non-existent parent_department_id - should return empty data array
  const nonExistentParentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const filteredNonExistent =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: nonExistentParentId,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(filteredNonExistent);
  // Non-existent parent should return empty data
  TestValidator.equals(
    "non-existent parent returns empty data",
    filteredNonExistent.data.length,
    0,
  );
  // 4. Test with null parent_department_id - should return only root departments
  const filteredRootOnly =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: null,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(filteredRootOnly);
  // Validate all returned departments have null parent (root level)
  for (const dept of filteredRootOnly.data) {
    TestValidator.equals(
      "root department has null parent",
      dept.parent_department,
      null,
    );
  }
  // 5. Test with omitted parent_department_id - should return all departments
  const allDeptList =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          // parent_department_id omitted - returns all departments
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(allDeptList);
  // Validate response structure for unfiltered request
  TestValidator.predicate(
    "all departments response has pagination",
    allDeptList.pagination !== undefined,
  );
  TestValidator.predicate(
    "all departments response has data array",
    Array.isArray(allDeptList.data),
  );
  // Total should be greater than or equal to root departments only
  TestValidator.predicate(
    "all departments includes root departments",
    allDeptList.data.length >= filteredRootOnly.data.length,
  );
  // 6. Validate department summary structure
  if (allDeptList.data.length > 0) {
    const sampleDept = allDeptList.data[0];
    TestValidator.predicate(
      "department has id",
      sampleDept.id !== undefined && sampleDept.id !== null,
    );
    TestValidator.predicate(
      "department has name",
      sampleDept.name !== undefined && sampleDept.name !== null,
    );
    TestValidator.predicate(
      "department has created_at",
      sampleDept.created_at !== undefined && sampleDept.created_at !== null,
    );
    // Validate parent_department is either null or has correct structure
    if (sampleDept.parent_department !== null) {
      TestValidator.predicate(
        "parent department has id",
        sampleDept.parent_department.id !== undefined,
      );
      TestValidator.predicate(
        "parent department has name",
        sampleDept.parent_department.name !== undefined,
      );
      TestValidator.predicate(
        "parent department has created_at",
        sampleDept.parent_department.created_at !== undefined,
      );
    }
  }
  // 7. Test pagination parameters with parent filter
  const paginatedFilter =
    await api.functional.hrm.member.organizations.departments.index(
      memberConnection,
      {
        organizationId,
        body: {
          parent_department_id: parentDepartmentId,
          limit: 10,
          page: 1,
        } satisfies IHrmDepartment.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    paginatedFilter.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginatedFilter.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginatedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginatedFilter.pagination.pages >= 0,
  );
  // Data length should not exceed limit
  TestValidator.predicate(
    "data length respects limit",
    paginatedFilter.data.length <= paginatedFilter.pagination.limit ||
      paginatedFilter.pagination.limit === 0,
  );
}
