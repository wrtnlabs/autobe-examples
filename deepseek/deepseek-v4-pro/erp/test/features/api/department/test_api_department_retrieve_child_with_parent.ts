import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
 * Verify that the one-level parent-child hierarchy is correctly reflected when retrieving a child department.
 *
 * Creates a top-level parent department ("Engineering") and then a child department ("QA") nested under it via the parent_id reference. Retrieves the child department by its ID and confirms the parent field in the response is populated with the parent department's IErpHrmDepartment.ISummary containing the correct id and name.
 *
 * 1. Authenticate as a new member via authorize_member_join.
 * 2. Create the parent department "Engineering" with no parent_id.
 * 3. Create the child department "QA" with parent_id referencing the parent.
 * 4. Retrieve the child department by its ID.
 * 5. Validate the parent field is non-null with matching id and name.
 * 6. Validate the child's own name and description match the creation payload.
 */
export async function test_api_department_retrieve_child_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create parent department
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Engineering",
        description: "Engineering department",
      },
    });
  typia.assert(parentDepartment);
  // 3. Create child department with parent_id
  const childName = "QA";
  const childDescription = "Quality Assurance team";
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: childName,
        description: childDescription,
        parent_id: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // 4. Retrieve child department by ID
  const retrieved = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    { departmentId: childDepartment.id },
  );
  typia.assert(retrieved);
  // 5. Validate parent hierarchy
  TestValidator.predicate(
    "child department has parent",
    retrieved.parent !== null,
  );
  if (retrieved.parent !== null) {
    TestValidator.equals(
      "parent id matches",
      retrieved.parent.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrieved.parent.name,
      parentDepartment.name,
    );
  }
  // 6. Validate child's own data
  TestValidator.equals("child name matches payload", retrieved.name, childName);
  TestValidator.equals(
    "child description matches payload",
    retrieved.description,
    childDescription,
  );
}
