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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

/**
 * Test department hierarchy filtering capability.
 *
 * This test validates that the department listing endpoint correctly filters
 * departments by parent_id, supporting single-level hierarchy where:
 * - parent_id = null returns only top-level departments
 * - parent_id = UUID returns only direct children of that department
 * - Departments cannot have grandchildren (one-level hierarchy constraint)
 */
export async function test_api_department_hierarchy_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a parent department (top-level, no parent)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { parent_id: null },
    });
  typia.assert(parentDepartment);
  TestValidator.equals("parent has no parent", parentDepartment.parent, null);
  // 3. Create a child department under the parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { parent_id: parentDepartment.id },
    });
  typia.assert(childDepartment);
  // 4. Verify child's parent field references the parent department
  TestValidator.predicate("child has parent", childDepartment.parent !== null);
  TestValidator.equals(
    "child parent id",
    childDepartment.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parent name",
    childDepartment.parent!.name,
    parentDepartment.name,
  );
  // 5. Test filtering with parent_id = null (top-level departments only)
  const topLevelResponse = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    { body: { parent_id: null } },
  );
  typia.assert(topLevelResponse);
  // Validate parent appears in top-level results
  const topLevelIds = topLevelResponse.data.map((d) => d.id);
  TestValidator.predicate(
    "parent in top-level results",
    topLevelIds.includes(parentDepartment.id),
  );
  // Validate child does NOT appear in top-level results
  TestValidator.predicate(
    "child not in top-level results",
    !topLevelIds.includes(childDepartment.id),
  );
  // 6. Test filtering with parent_id = parent's UUID (children only)
  const childrenResponse = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    { body: { parent_id: parentDepartment.id } },
  );
  typia.assert(childrenResponse);
  // Validate child appears in children results
  const childrenIds = childrenResponse.data.map((d) => d.id);
  TestValidator.predicate(
    "child in children results",
    childrenIds.includes(childDepartment.id),
  );
  // Validate parent does NOT appear in children results
  TestValidator.predicate(
    "parent not in children results",
    !childrenIds.includes(parentDepartment.id),
  );
  // 7. Validate child's parent summary in the response
  const childInResponse = childrenResponse.data.find(
    (d) => d.id === childDepartment.id,
  );
  TestValidator.predicate(
    "child found in children response",
    childInResponse !== undefined,
  );
  TestValidator.predicate(
    "child has parent field",
    childInResponse!.parent !== null,
  );
  TestValidator.equals(
    "child parent id matches",
    childInResponse!.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parent name matches",
    childInResponse!.parent!.name,
    parentDepartment.name,
  );
}
