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

/**
 * Retrieves a child department and validates the parent hierarchy reference.
 *
 * Verifies that retrieving a child department returns the full department entity including the parent department reference with the correct parent summary data. Confirms the one-level nesting business rule where a child department must reference a top-level parent department. The retrieved child department includes the parent department's identifier and name through the IHrmPlatformDepartment.ISummary reference.
 *
 * 1. Joins a new member account, automatically creating a default organization.
 * 2. Creates a parent top-level department named 'Engineering' without a parent reference.
 * 3. Creates a child department named 'Backend Team' referencing the parent department's ID.
 * 4. Retrieves the child department by its ID.
 * 5. Validates the response conforms to IHrmPlatformDepartment schema with non-null parentDepartment.
 * 6. Validates the parent department summary has a name matching 'Engineering'.
 * 7. Validates the organization field contains the default organization summary (validated by typia.assert).
 */
export async function test_api_department_retrieval_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member account, automatically creating a default organization
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create a parent top-level department named 'Engineering' without a parent reference
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create a child department named 'Backend Team' referencing the parent department's ID
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Backend Team",
          parent_department_id: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Retrieve the child department by its ID
  const department = await api.functional.hrmPlatform.member.departments.at(
    memberConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(department);
  // 5 & 6. Validate the response conforms to IHrmPlatformDepartment schema and parent hierarchy
  TestValidator.equals("department name", department.name, "Backend Team");
  TestValidator.equals(
    "parent department name",
    department.parentDepartment!.name,
    "Engineering",
  );
}
