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
 * Test department listing hierarchy filtering by parent department.
 *
 * Validates that the department listing endpoint correctly filters departments
 * by their parent department to support navigation of the one-level
 * parent-child hierarchy. The test creates a top-level parent department
 * (Engineering) and a child department (Engineering-QA) under it, then verifies
 * that filtering by parent_id correctly isolates departments at each level.
 *
 * 1. Member authenticates via join to access organization-scoped endpoints.
 * 2. Creates a top-level "Engineering" department with no parent.
 * 3. Creates "Engineering-QA" as a child department under Engineering.
 * 4. Lists departments with parent_id set to null, verifying only top-level
 *    departments are returned and Engineering has children_count of 1.
 * 5. Lists departments with parent_id set to Engineering's ID, verifying
 *    only Engineering-QA is returned and correctly references its parent.
 */
export async function test_api_department_list_hierarchy_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create top-level "Engineering" department
  const engineering = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { name: "Engineering" } },
  );
  typia.assert(engineering);
  // 3. Create child "Engineering-QA" department under Engineering
  const engineeringQa = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {
      body: {
        name: "Engineering-QA",
        parent_id: engineering.id,
      },
    },
  );
  typia.assert(engineeringQa);
  // 4. List top-level departments only (parent_id: null)
  const topLevelResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        parent_id: null,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(topLevelResult);
  // 5. Assert top-level filtering
  const topLevelIds = topLevelResult.data.map((d) => d.id);
  TestValidator.predicate(
    "Engineering appears in top-level results",
    topLevelIds.includes(engineering.id),
  );
  TestValidator.predicate(
    "Engineering-QA is excluded from top-level results",
    !topLevelIds.includes(engineeringQa.id),
  );
  const engineeringSummary = topLevelResult.data.find(
    (d) => d.id === engineering.id,
  );
  typia.assertGuard(engineeringSummary!);
  TestValidator.equals(
    "Engineering has children_count of 1",
    engineeringSummary.children_count satisfies number as number,
    1,
  );
  // 6. List child departments under Engineering
  const childResult = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {
        parent_id: engineering.id,
      } satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(childResult);
  // 7. Assert child-level filtering
  TestValidator.equals(
    "Only one child department returned",
    childResult.data.length,
    1,
  );
  TestValidator.equals(
    "Child department is Engineering-QA",
    childResult.data[0].id,
    engineeringQa.id,
  );
  TestValidator.equals(
    "Child references Engineering as parent by id",
    childResult.data[0].parent?.id,
    engineering.id,
  );
  TestValidator.equals(
    "Child references Engineering as parent by name",
    childResult.data[0].parent?.name,
    engineering.name,
  );
}
