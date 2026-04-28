import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project creation with only mandatory fields.
 *
 * Validates that an authenticated member can create a project by providing only the required name and color_code fields. Ensures the system correctly defaults the project status to 'Active', leaves all optional fields as null, and auto-generates audit timestamps upon creation.
 *
 * Special attention is given to verifying that omitting optional fields (description, budget, start_date, end_date) does not cause validation errors, and that the returned entity accurately reflects a freshly initialized project record.
 *
 * 1. Authenticates a new member account to establish an active organization context.
 * 2. Constructs a minimal project creation payload with only name and color_code.
 * 3. Creates the project via the authenticated member connection.
 * 4. Validates response types, default status, null optional fields, and auto-generated timestamps.
 */
export async function test_api_project_creation_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare minimal request body (only mandatory fields)
  const body = {
    name: RandomGenerator.name(),
    color_code: "#FF5733",
  } satisfies IHrmPlatformProject.ICreate;
  // 3. Create project
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    { body },
  );
  typia.assert(project);
  // 4. Validate business logic and defaults
  TestValidator.equals("status defaults to Active", project.status, "Active");
  TestValidator.equals("deleted_at is null", project.deleted_at, null);
  TestValidator.equals("description is null", project.description, null);
  TestValidator.equals("budget is null", project.budget, null);
  TestValidator.equals("start_date is null", project.start_date, null);
  TestValidator.equals("end_date is null", project.end_date, null);
  TestValidator.predicate(
    "created_at is populated",
    project.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    project.updated_at.length > 0,
  );
}
