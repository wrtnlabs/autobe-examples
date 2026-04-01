import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_retrieve_active_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a top-level department (no parent)
  const department =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          parent_department_id: null,
        },
      },
    );
  typia.assert(department);
  // 3. Retrieve the department by ID
  const retrieved = await api.functional.hrmPlatform.member.departments.at(
    memberConnection,
    {
      departmentId: department.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved department
  TestValidator.equals("department ID matches", retrieved.id, department.id);
  TestValidator.equals(
    "department name matches",
    retrieved.name,
    department.name,
  );
  TestValidator.equals(
    "department description matches",
    retrieved.description,
    department.description,
  );
  TestValidator.equals(
    "parentDepartment is null (top-level)",
    retrieved.parentDepartment,
    null,
  );
  TestValidator.equals(
    "organization ID matches",
    retrieved.organization.id,
    department.organization.id,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(retrieved.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(retrieved.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrieved.deleted_at,
    null,
  );
}
