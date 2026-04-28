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

/**
 * Test department search functionality with case-insensitive matching and status filtering.
 *
 * Validates the department list endpoint's ability to filter by name substring regardless of case, filter by active or deleted status, and sort results. Ensures that soft-deleted departments only appear in queries explicitly requesting deleted status, and that active status filters exclude them.
 *
 * 1. Authenticate as a member.
 * 2. Create three departments: "Engineering", "Sales", and "HR".
 * 3. Soft-delete the "Sales" department.
 * 4. Search for "engineering", "Engineering", and "ENGINEERING" to verify case-insensitivity.
 * 5. Search for "Eng" to verify partial substring matching.
 * 6. Filter by status="active" to ensure "Sales" is excluded.
 * 7. Filter by status="deleted" to ensure "Sales" is included and others excluded.
 * 8. Test combined filters and sorting.
 */
export async function test_api_department_search_and_status_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create departments
  const engineering =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: { name: "Engineering" },
      },
    );
  typia.assert(engineering);
  const sales = await generate_random_hrm_platform_member_departments_create(
    memberConnection,
    {
      body: { name: "Sales" },
    },
  );
  typia.assert(sales);
  const hr = await generate_random_hrm_platform_member_departments_create(
    memberConnection,
    {
      body: { name: "HR" },
    },
  );
  typia.assert(hr);
  // 3. Soft-delete "Sales"
  await api.functional.hrmPlatform.member.departments.erase(memberConnection, {
    departmentId: sales.id,
  });
  // 4. Case-insensitive search
  const lowerCaseSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          name_search: "engineering",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(lowerCaseSearch);
  TestValidator.predicate(
    "lowercase search finds Engineering",
    lowerCaseSearch.data.some((d) => d.name === "Engineering"),
  );
  const upperCaseSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          name_search: "ENGINEERING",
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(upperCaseSearch);
  TestValidator.predicate(
    "uppercase search finds Engineering",
    upperCaseSearch.data.some((d) => d.name === "Engineering"),
  );
  // 5. Partial match
  const partialSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: { name_search: "Eng" } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(partialSearch);
  TestValidator.predicate(
    "partial search finds Engineering",
    partialSearch.data.some((d) => d.name === "Engineering"),
  );
  // 6. Status filter active
  const activeSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: { status: "active" } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(activeSearch);
  TestValidator.predicate(
    "active filter excludes deleted Sales",
    !activeSearch.data.some((d) => d.name === "Sales"),
  );
  TestValidator.predicate(
    "active filter includes Engineering and HR",
    activeSearch.data.some((d) => d.name === "Engineering") &&
      activeSearch.data.some((d) => d.name === "HR"),
  );
  // 7. Status filter deleted
  const deletedSearch =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: { status: "deleted" } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(deletedSearch);
  TestValidator.predicate(
    "deleted filter includes Sales",
    deletedSearch.data.some((d) => d.name === "Sales"),
  );
  TestValidator.predicate(
    "deleted filter excludes Engineering and HR",
    !deletedSearch.data.some((d) => d.name === "Engineering") &&
      !deletedSearch.data.some((d) => d.name === "HR"),
  );
  // 8. Sorting
  const sortedAsc = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.predicate(
    "sort asc orders Engineering before HR",
    sortedAsc.data.findIndex((d) => d.name === "Engineering") <
      sortedAsc.data.findIndex((d) => d.name === "HR"),
  );
  const sortedDesc = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "desc",
      } satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.predicate(
    "sort desc orders HR before Engineering",
    sortedDesc.data.findIndex((d) => d.name === "HR") <
      sortedDesc.data.findIndex((d) => d.name === "Engineering"),
  );
}
