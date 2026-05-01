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
 * Verify that a department with active child departments cannot be deleted.
 *
 * Tests the hierarchical integrity constraint that prevents deletion of a parent department when it has active child departments nested under it. This protects the organizational structure from orphaned departments and ensures administrators must explicitly reassign or remove children before removing a parent node.
 *
 * The deletion endpoint must return 409 Conflict with a message indicating that child departments must be reassigned or deleted first. The constraint is enforced by a pre-deletion check that queries for non-deleted child departments referencing the target department as their parent.
 *
 * 1. Member registers and authenticates, obtaining org:manage permission.
 * 2. Creates a top-level parent department with a random unique name.
 * 3. Creates a child department nested under the parent using parent_id.
 * 4. Attempts to delete the parent department, expecting 409 Conflict rejection.
 */
export async function test_api_department_delete_blocked_by_child_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create parent department
  const parent = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(parent);
  // 3. Create child department nested under parent
  const child = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    { body: { parent_id: parent.id } },
  );
  typia.assert(child);
  // 4. Attempt to delete parent — expect 409 Conflict due to child departments
  await TestValidator.httpError(
    "parent with child departments cannot be deleted",
    409,
    async () =>
      await api.functional.erpHrm.member.departments.erase(memberConnection, {
        departmentId: parent.id,
      }),
  );
}
