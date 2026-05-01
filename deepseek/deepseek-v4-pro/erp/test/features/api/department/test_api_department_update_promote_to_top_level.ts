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
 * Test promoting a child department to a top-level department by clearing its parent reference.
 *
 * Validates the department hierarchy restructuring capability where a nested child department can be promoted to the root level. The test creates a parent-child relationship, then promotes the child by setting parent_id to null through the update endpoint, confirming the one-level nesting constraint does not block upward promotion.
 *
 * 1. Member authenticates via join to obtain org:manage permission.
 * 2. A top-level parent department is created with no parent reference.
 * 3. A child department is created nested under the parent.
 * 4. The child department is updated with parent_id set to null.
 * 5. Verifies the promoted department now has parent as null and its id is unchanged.
 */
export async function test_api_department_update_promote_to_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a top-level parent department
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(parentDepartment);
  TestValidator.predicate(
    "parent department is top-level",
    parentDepartment.parent === null,
  );
  // 3. Create a child department nested under the parent
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        parent_id: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  TestValidator.predicate(
    "child department has parent",
    childDepartment.parent !== null,
  );
  // 4. Promote child to top-level by setting parent_id to null
  const promotedDepartment =
    await api.functional.erpHrm.member.departments.update(memberConnection, {
      departmentId: childDepartment.id,
      body: {
        parent_id: null,
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(promotedDepartment);
  // 5. Validate promotion
  TestValidator.equals(
    "promoted department is now top-level",
    promotedDepartment.parent,
    null,
  );
  TestValidator.equals(
    "promoted department id unchanged",
    promotedDepartment.id,
    childDepartment.id,
  );
}
