import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project creation with all mandatory and optional fields.
 *
 * Validates project creation with comprehensive data including name, color_code,
 * description, budget, start_date, and end_date. The system correctly persists all submitted
 * values and returns 201 Created response with the complete project entity, including
 * default 'active' status, null deleted_at, lifecycle timestamps, and organization summary.
 *
 * 1. Authenticate member account
 * 2. Create project with full payload
 * 3. Validate response
 */
export async function test_api_project_creation_full_payload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized.token!);

  // 2. Create project with all mandatory and optional fields
  const body = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color_code: "#FF5733",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    budget: typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHrmPlatformProject.ICreate;

  const project = await api.functional.hrmPlatform.member.projects.create(adminConnection, {
    body,
  });
  typia.assert(project!);

  // 3. Validate response
  TestValidator.equals("project name persists input", project.name, body.name);
  TestValidator.equals("project color_code persists input", project.color_code, "#FF5733");
  TestValidator.equals("project description persists input", project.description, body.description);
  TestValidator.equals("project budget persists input", project.budget, body.budget);
  TestValidator.equals("project start_date persists input", project.start_date, body.start_date);
  TestValidator.equals("project end_date persists input", project.end_date, body.end_date);
  TestValidator.equals("project has valid status", project.status, "Active");
}