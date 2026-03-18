import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_parent_id_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization for context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: `Parent-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: null,
      },
    });
  typia.assert(parentDepartment);
  // 4. Create child departments under the parent
  const childDepartments = await ArrayUtil.asyncRepeat(3, async () => {
    return generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: `Child-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentDepartmentId: parentDepartment.id,
      },
    });
  });
  for (const child of childDepartments) {
    typia.assert(child);
  }
  // 5. Test filtering by parentDepartmentId - should return only children
  const childrenList = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        parentDepartmentId: parentDepartment.id,
        limit: 10,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(childrenList);
  // Validate only child departments are returned
  TestValidator.equals(
    "children count matches",
    childDepartments.length,
    childrenList.data.length,
  );
  // Validate each returned department has correct parent reference
  for (const dept of childrenList.data) {
    TestValidator.equals(
      `department ${dept.id} has correct parent`,
      parentDepartment.id,
      dept.parentDepartment?.id,
    );
  }
  // Validate parent department is not in children list
  const hasParentInChildren = childrenList.data.some(
    (dept) => dept.id === parentDepartment.id,
  );
  TestValidator.predicate(
    "parent department excluded from children filter results",
    !hasParentInChildren,
  );
  // Validate all expected children are present (by checking IDs match)
  const expectedChildIds = childDepartments.map((d) => d.id).sort();
  const actualChildIds = childrenList.data.map((d) => d.id).sort();
  TestValidator.equals(
    "all children returned with correct IDs",
    expectedChildIds,
    actualChildIds,
  );
  // 6. Test filtering by "null" - should return only top-level departments
  const topLevelList = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        parentDepartmentId: "null",
        limit: 10,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(topLevelList);
  // Validate parent department is in top-level list
  const hasParentInTopLevel = topLevelList.data.some(
    (dept) => dept.id === parentDepartment.id,
  );
  TestValidator.predicate(
    "parent department included in top-level filter results",
    hasParentInTopLevel,
  );
  // Validate no child departments are in top-level list
  const childIds = childDepartments.map((c) => c.id);
  const hasChildrenInTopLevel = topLevelList.data.some((dept) =>
    childIds.includes(dept.id),
  );
  TestValidator.predicate(
    "child departments excluded from top-level filter results",
    !hasChildrenInTopLevel,
  );
  // Validate top-level departments have null parent
  for (const dept of topLevelList.data) {
    TestValidator.equals(
      `top-level department ${dept.id} has null parent`,
      null,
      dept.parentDepartment as null | undefined,
    );
  }
  // 7. Test pagination metadata
  TestValidator.equals("current page is 1", 1, childrenList.pagination.current);
  TestValidator.equals(
    "records count matches",
    childDepartments.length,
    childrenList.pagination.records,
  );
  TestValidator.predicate(
    "pages count is valid",
    childrenList.pagination.pages >= 1,
  );
}