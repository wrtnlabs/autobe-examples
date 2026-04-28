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
 * Test retrieving a single top-level department by its UUID.
 *
 * Validates the department retrieval endpoint returns complete department details including name, description, parent department reference, organization summary, and system metadata. Verifies that top-level departments have null parentDepartment and null deleted_at fields indicating an active root-level department.
 *
 * Setup involves joining a new member account which automatically creates a default organization, then creating a top-level department within that organization context.
 *
 * 1. Join as a new member to create and authenticate with a default organization.
 * 2. Create a top-level department using the generation utility.
 * 3. Retrieve the department by its unique ID.
 * 4. Validate response type and business logic fields.
 */
export async function test_api_department_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - join member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create top-level department
  const created: IHrmPlatformDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      { body: { name: "Engineering" } },
    );
  typia.assert(created);
  // 3. Retrieve department by ID
  const retrieved = await api.functional.hrmPlatform.member.departments.at(
    memberConnection,
    {
      departmentId: created.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate business logic
  TestValidator.equals(
    "department name matches input",
    retrieved.name,
    "Engineering",
  );
  TestValidator.equals(
    "parentDepartment is null for top-level",
    retrieved.parentDepartment,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active department",
    retrieved.deleted_at,
    null,
  );
  TestValidator.predicate(
    "organization summary is present with valid id",
    retrieved.organization.id !== null,
  );
}
