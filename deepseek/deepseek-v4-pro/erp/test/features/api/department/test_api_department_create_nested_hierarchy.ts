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
 * Test nested department hierarchy creation with parent-child relationship validation.
 *
 * Validates the two-level department hierarchy by creating a top-level parent department and then a child department referencing the parent. Ensures the one-level nesting constraint is properly enforced at the API level and that the child department correctly references its parent in the response.
 *
 * 1. Authenticates a member with org:manage permission via join.
 * 2. Creates a top-level parent department without a parent reference.
 * 3. Creates a child department referencing the parent's UUID as parent_id.
 * 4. Validates the child department response includes a non-null parent field with matching id and name, and that the child has its own unique identifier distinct from the parent.
 */
export async function test_api_department_create_nested_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create parent department
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { parent_id: null },
    });
  typia.assert(parentDepartment);
  // 3. Create child department with parent reference
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: { parent_id: parentDepartment.id },
    });
  typia.assert(childDepartment);
  // 4. Validate hierarchy
  TestValidator.predicate("child has parent", childDepartment.parent !== null);
  TestValidator.equals(
    "parent id matches",
    childDepartment.parent!.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "parent name matches",
    childDepartment.parent!.name,
    parentDepartment.name,
  );
  TestValidator.notEquals(
    "child has unique id",
    childDepartment.id,
    parentDepartment.id,
  );
}
