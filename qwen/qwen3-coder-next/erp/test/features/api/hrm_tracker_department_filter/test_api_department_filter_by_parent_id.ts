import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_departments_create } from "../../../generate/generate_random_hrm_tracker_member_departments_create";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_department } from "../../../prepare/prepare_random_hrm_tracker_department";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_department_filter_by_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member actor for authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create organization context
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create parent department
  const parentDepartment =
    await generate_random_hrm_tracker_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          parent_id: null,
        },
      },
    );
  typia.assert(parentDepartment);
  // Verify parent department has null parent (root department)
  TestValidator.equals(
    "parent department parent is null",
    parentDepartment.parent,
    null,
  );
  // 4. Create child departments under parent (2 direct children)
  const childDepartments = ArrayUtil.repeat(2, () =>
    generate_random_hrm_tracker_member_departments_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        parent_id: parentDepartment.id,
      },
    }),
  );
  const children = await Promise.all(childDepartments);
  children.forEach((c) => typia.assert(c));
  // 5. Create independent department (without parent) for comparison
  const independentDepartment =
    await generate_random_hrm_tracker_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          parent_id: null,
        },
      },
    );
  typia.assert(independentDepartment);
  // 6. Test filtering by parent_id
  const filteredResponse = await api.functional.hrmTracker.departments.index(
    memberConnection,
    {
      body: {
        parent_id: parentDepartment.id,
      },
    },
  );
  typia.assert(filteredResponse);
  // 7. Validate filtering results
  TestValidator.equals(
    "filtered count matches direct children count",
    filteredResponse.data.length,
    children.length,
  );
  // 8. Validate each filtered department has correct parent_id
  for (const department of filteredResponse.data) {
    TestValidator.predicate(
      "department has parent",
      department.parent !== null,
    );
    TestValidator.equals(
      "department parent matches filtered parent",
      department.parent?.id,
      parentDepartment.id,
    );
    // Verify the filtered department structure is correct
    typia.assert(department);
  }
  // 9. Validate independent department not included in filtered results
  TestValidator.predicate(
    "independent department not in filtered results",
    filteredResponse.data.every((d) => d.id !== independentDepartment.id),
  );
  // 10. Validate all returned departments are direct children
  const allParentIds = filteredResponse.data.map((d) => d.parent?.id);
  TestValidator.predicate(
    "all departments have matching parent_id",
    allParentIds.every((id) => id === parentDepartment.id),
  );
}
