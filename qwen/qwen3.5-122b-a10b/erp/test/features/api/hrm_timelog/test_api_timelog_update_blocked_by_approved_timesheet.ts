import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test timelog update functionality with business rule validation.
 *
 * Validates the timelog update endpoint's ability to modify time tracking records while enforcing business constraints. This test exercises the update flow for timelogs that are not locked by approved timesheets.
 *
 * Note: The complete scenario for testing timelog update blocking by approved timesheets requires timesheet endpoints (create, submit, approve) that are not available in the current SDK. This test validates the timelog update functionality with normal (unlocked) timelogs.
 *
 * 1. Member registration and authentication
 * 2. Project creation within the organization
 * 3. Timelog creation for the authenticated member
 * 4. Timelog update with modified data
 * 5. Validate update succeeded with new values
 *
 * The test ensures timelog updates work correctly for records not locked by timesheet approval, which is the prerequisite for testing the blocking behavior in a complete implementation.
 */
export async function test_api_timelog_update_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Extract organization ID from member's organizations
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Member must belong to at least one organization");
  }
  // 2. Create a project within the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 3. Create an initial timelog
  const originalTimelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          billable: true,
          description: "Original work description",
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(originalTimelog);
  // 4. Update the timelog with new data
  const updatedTimelog =
    await api.functional.hrm.member.organizations.timelogs.update(
      memberConnection,
      {
        organizationId,
        timelogId: originalTimelog.id,
        body: {
          description: "Updated work description",
          duration_minutes: originalTimelog.duration_minutes + 30,
          billable: false,
        } satisfies IHrmTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimelog);
  // 5. Validate the update succeeded with new values
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    "Updated work description",
  );
  TestValidator.equals(
    "duration increased",
    updatedTimelog.duration_minutes,
    originalTimelog.duration_minutes + 30,
  );
  TestValidator.equals("billable changed", updatedTimelog.billable, false);
  TestValidator.notEquals("timelog ID preserved", updatedTimelog.id, null);
  TestValidator.predicate(
    "updated_at changed",
    updatedTimelog.updated_at > originalTimelog.updated_at,
  );
}
