import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

/**
 * Test creating a project with all optional fields filled in.
 *
 * Validates that a project can be created with all available optional fields specified (name, color_code, description, budget_hours, started_at, ended_at), and that the response correctly reflects all input values. Also verifies that the project is automatically associated with the correct organization context and defaults to 'active' status.
 *
 * Special attention is given to verifying that the organization scoping works correctly — the project's organization.id must match the created organization's ID. Also validates that system-generated fields such as id (UUID format), created_at, updated_at are populated, and deleted_at is null for a newly created active project.
 *
 * 1. Member registration: Register a new member account via authorize_member_join.
 * 2. Organization creation: Create an organization with specific configuration (USD, Asia/Seoul, fiscal start month 1).
 * 3. Project creation: Create a project with all fields filled in (name, color_code, description, budget_hours, started_at, ended_at).
 * 4. Validation: Verify all response fields match input values and business logic expectations.
 */
export async function test_api_project_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth setup: register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Organization creation with specific configuration
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Test Org ${RandomGenerator.alphaNumeric(8)}`,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Project creation with all fields filled
  const project = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: {
        name: "Website Redesign",
        color_code: "#FF5733",
        description:
          "Complete overhaul of the company website including new branding",
        budget_hours: 500,
        started_at: "2026-05-01T00:00:00.000Z",
        ended_at: "2026-08-31T00:00:00.000Z",
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Validate response fields
  TestValidator.equals("name matches", project.name, "Website Redesign");
  TestValidator.equals("color_code matches", project.color_code, "#FF5733");
  TestValidator.equals(
    "description matches",
    project.description,
    "Complete overhaul of the company website including new branding",
  );
  TestValidator.equals("budget_hours matches", project.budget_hours, 500);
  TestValidator.equals(
    "started_at matches",
    project.started_at,
    "2026-05-01T00:00:00.000Z",
  );
  TestValidator.equals(
    "ended_at matches",
    project.ended_at,
    "2026-08-31T00:00:00.000Z",
  );
  TestValidator.equals("status is active", project.status, "active");
  TestValidator.equals(
    "organization id matches",
    project.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "created_at is populated",
    () => !!project.created_at,
  );
  TestValidator.predicate(
    "updated_at is populated",
    () => !!project.updated_at,
  );
  TestValidator.equals("deleted_at is null", project.deleted_at, null);
}
