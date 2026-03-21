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

export async function test_api_department_update_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create initial department with name and description
  const initialDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Human Resources",
        description: "HR department",
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(initialDepartment);
  // Store initial values for comparison
  const departmentId = initialDepartment.id;
  const initialCreatedAt = initialDepartment.created_at;
  const initialParent = initialDepartment.parent;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. First update: update only the name, description omitted
  const firstUpdate = await api.functional.erpHrm.member.departments.update(
    memberConnection,
    {
      departmentId,
      body: { name: "People Operations" } satisfies IErpHrmDepartment.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Validate after first update
  TestValidator.equals(
    "name updated after first update",
    firstUpdate.name,
    "People Operations",
  );
  TestValidator.equals(
    "description unchanged after first update",
    firstUpdate.description,
    "HR department",
  );
  TestValidator.equals(
    "id unchanged after first update",
    firstUpdate.id,
    departmentId,
  );
  TestValidator.equals(
    "parent unchanged after first update",
    firstUpdate.parent,
    initialParent,
  );
  TestValidator.equals(
    "created_at unchanged after first update",
    firstUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after first update",
    firstUpdate.updated_at !== initialDepartment.updated_at,
  );
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Second update: update only the description, name omitted
  const secondUpdate = await api.functional.erpHrm.member.departments.update(
    memberConnection,
    {
      departmentId,
      body: {
        description: "People and Culture team",
      } satisfies IErpHrmDepartment.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 6. Validate after second update
  TestValidator.equals(
    "name unchanged after second update",
    secondUpdate.name,
    "People Operations",
  );
  TestValidator.equals(
    "description updated after second update",
    secondUpdate.description,
    "People and Culture team",
  );
  TestValidator.equals(
    "id unchanged after second update",
    secondUpdate.id,
    departmentId,
  );
  TestValidator.equals(
    "parent unchanged after second update",
    secondUpdate.parent,
    initialParent,
  );
  TestValidator.equals(
    "created_at unchanged after second update",
    secondUpdate.created_at,
    initialCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after second update",
    secondUpdate.updated_at !== firstUpdate.updated_at,
  );
}
