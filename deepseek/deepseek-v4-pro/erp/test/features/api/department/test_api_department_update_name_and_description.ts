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
 * Test partial update of department name and description.
 *
 * Validates that a member with organization management permission can update only the name and description fields of an existing department while all other fields remain unchanged. This verifies the partial update contract — fields omitted from the request body must preserve their existing values.
 *
 * The test also confirms that the updated_at timestamp is automatically refreshed upon modification, while immutable fields like id, created_at, erp_hrm_organization_id, and parent are not altered.
 *
 * 1. Member authenticates via join, gaining org:manage permission as Organization Owner.
 * 2. A department is created with randomized data as the baseline.
 * 3. Only name and description are sent in the update request — parent_id is omitted.
 * 4. Response validates that name and description match the new values.
 * 5. Response validates that id, parent, created_at, organization context, and deleted_at remain identical.
 * 6. Response validates that updated_at has been refreshed.
 */
export async function test_api_department_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a department to update
  const department = await generate_random_erp_hrm_member_departments_create(
    memberConnection,
    {},
  );
  typia.assert(department);
  // 3. Prepare new name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  // 4. Partially update — only name and description
  const updated = await api.functional.erpHrm.member.departments.update(
    memberConnection,
    {
      departmentId: department.id,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IErpHrmDepartment.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate updated fields
  TestValidator.equals("name updated", updated.name, updatedName);
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  // 6. Validate immutable and preserved fields
  TestValidator.equals("id unchanged", updated.id, department.id);
  TestValidator.equals("parent unchanged", department.parent, updated.parent);
  TestValidator.equals(
    "organization unchanged",
    updated.erp_hrm_organization_id,
    department.erp_hrm_organization_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    department.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    department.deleted_at,
  );
  // 7. Validate updated_at is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    department.updated_at,
    updated.updated_at,
  );
}
