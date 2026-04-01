import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_list_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create parent department (top-level, no parent_department_id)
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create child departments under the parent
  const childDepartment1 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment1);
  const childDepartment2 =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment2);
  // 4. Filter department list by parent_department_id
  const filteredResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 5. Verify only child departments are returned
  TestValidator.predicate(
    "filtered results should only contain children of parent",
    filteredResult.data.every(
      (dept) => dept.parent !== null && dept.parent.id === parentDepartment.id,
    ),
  );
  TestValidator.predicate(
    "filtered results should contain at least 2 child departments",
    filteredResult.data.length >= 2,
  );
  TestValidator.predicate(
    "filtered results should not contain the parent department itself",
    !filteredResult.data.some((dept) => dept.id === parentDepartment.id),
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    filteredResult.pagination.records,
    filteredResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    filteredResult.pagination.pages >= 1,
  );
  // 7. Create another parent department with no children
  const emptyParentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(emptyParentDepartment);
  // 8. Test filtering by parent_department_id with no children
  const emptyFilteredResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: emptyParentDepartment.id,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(emptyFilteredResult);
  // 9. Verify empty result handling
  TestValidator.equals(
    "empty parent should have 0 records",
    emptyFilteredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty parent should have 0 pages",
    emptyFilteredResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty parent should return empty data array",
    emptyFilteredResult.data.length,
    0,
  );
}